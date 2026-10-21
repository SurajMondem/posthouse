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


def device():
    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"


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
    pipe = StableAudioPipeline.from_pretrained(a.model, torch_dtype=dtype).to(dev)
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
