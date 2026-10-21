"""Stable Audio Open plugin for posthouse: text prompt -> WAV (up to 47 s). Good at sound effects and textures.

Runs in its own venv (posthouse setup stable-audio). The model is gated on Hugging Face: accept its terms at
https://huggingface.co/stabilityai/stable-audio-open-1.0 and log in once (huggingface-cli login).
Licence: Stability AI Community License (free commercial use under US$1M annual revenue).
Prints one JSON line on success: {"model": ..., "seconds": ..., "device": ...}
"""
import argparse
import json

import soundfile as sf
import torch
from diffusers import StableAudioPipeline
from diffusers.schedulers import scheduling_cosine_dpmsolver_multistep as cosine
from huggingface_hub import snapshot_download


def device():
    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"


class GaussianNoise:
    """Seeded i.i.d. Gaussian noise for the SDE solver steps (k-diffusion's default noise sampler)."""

    def __init__(self, x, sigma_min=None, sigma_max=None, seed=None, **_):
        seed = seed[0] if isinstance(seed, list) else seed
        self.gen = torch.Generator("cpu").manual_seed(seed if seed is not None else 0)
        self.shape = x.shape

    def __call__(self, sigma, sigma_next):
        return torch.randn(self.shape, generator=self.gen, dtype=torch.float32)


def use_gaussian_noise():
    # The scheduler's torchsde Brownian tree recurses without end on MPS/CPU float32 (RecursionError).
    # With a fixed step count, plain Gaussian noise is the standard choice and gives equivalent results.
    cosine.BrownianTreeNoiseSampler = GaussianNoise


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--prompt", required=True)
    p.add_argument("--seconds", type=float, default=10)
    p.add_argument("--out", required=True)
    p.add_argument("--model", default="stabilityai/stable-audio-open-1.0")
    p.add_argument("--steps", type=int, default=100)
    p.add_argument("--seed", type=int, default=0)
    a = p.parse_args()

    dev = device()
    dtype = torch.float16 if dev == "cuda" else torch.float32
    # The repo also holds a 4.5 GB single-file checkpoint for stable-audio-tools; diffusers never reads it.
    local = snapshot_download(a.model, ignore_patterns=["model.safetensors", "*.ckpt", "model_config.json"])
    pipe = StableAudioPipeline.from_pretrained(local, torch_dtype=dtype).to(dev)
    if dev != "cuda":
        use_gaussian_noise()
    gen = torch.Generator("cpu").manual_seed(a.seed)
    audio = pipe(
        a.prompt,
        negative_prompt="Low quality.",
        num_inference_steps=a.steps,
        audio_end_in_s=min(a.seconds, 47),
        num_waveforms_per_prompt=1,
        generator=gen,
    ).audios
    sf.write(a.out, audio[0].T.float().cpu().numpy(), pipe.vae.sampling_rate, format="WAV")
    print(json.dumps({"model": a.model, "seconds": min(a.seconds, 47), "device": dev}))


if __name__ == "__main__":
    main()
