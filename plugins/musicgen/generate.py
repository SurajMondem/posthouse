"""MusicGen plugin for posthouse: text prompt -> WAV. Runs in its own venv (posthouse setup musicgen).

Weights are CC-BY-NC 4.0 (non-commercial). posthouse records that in assets.lock.json.
Prints one JSON line on success: {"model": ..., "seconds": ..., "device": ...}
"""
import argparse
import json

import scipy.io.wavfile
import torch
from transformers import AutoProcessor, MusicgenForConditionalGeneration


def device():
    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--prompt", required=True)
    p.add_argument("--seconds", type=float, default=15)
    p.add_argument("--out", required=True)
    p.add_argument("--model", default="facebook/musicgen-small")
    a = p.parse_args()

    dev = device()
    processor = AutoProcessor.from_pretrained(a.model)
    model = MusicgenForConditionalGeneration.from_pretrained(a.model)
    try:
        model = model.to(dev)
    except Exception:  # some MPS builds miss an op; CPU always works
        dev = "cpu"
    inputs = processor(text=[a.prompt], padding=True, return_tensors="pt").to(dev)
    tokens = int(min(a.seconds, 30) * model.config.audio_encoder.frame_rate)
    with torch.no_grad():
        audio = model.generate(**inputs, max_new_tokens=tokens, do_sample=True)
    rate = model.config.audio_encoder.sampling_rate
    scipy.io.wavfile.write(a.out, rate, audio[0, 0].float().cpu().numpy())
    print(json.dumps({"model": a.model, "seconds": a.seconds, "device": dev}))


if __name__ == "__main__":
    main()
