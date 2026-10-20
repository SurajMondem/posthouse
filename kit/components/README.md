# kit/components

Reusable mechanisms for scenes: a chart, a gauge, a tap ripple, a waveform. When a video builds one worth reusing,
copy it here with a one-line header comment saying what it shows and how to use it. To use one, copy it into a
video's `src/video/` and adapt it; components here import from `../framework/` as if they lived in `src/video/`.

| Component | Shows |
|---|---|
| [Waveform.tsx](Waveform.tsx) | a live voice waveform whose loudness you drive with a 0–1 amplitude |
