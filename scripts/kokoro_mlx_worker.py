"""Kokoro on the Apple Silicon GPU (MLX), driven by scripts/gen-lesson-audio.mjs --engine mlx.

Protocol: one JSON request per stdin line, {"text", "voice", "out"}; the worker writes the
audio to `out` as raw little-endian float32 at 24 kHz and answers with one JSON line on
stdout, {"samples": n} or {"error": "..."}. Everything else it prints goes to stderr.

Setup (once):
  uv venv --python 3.12 ~/.cache/grokstack-tts
  VIRTUAL_ENV=~/.cache/grokstack-tts uv pip install mlx-audio "misaki[en]" \
    "en_core_web_sm @ https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl"
"""

import json
import os
import sys

# Keep stdout for the protocol; libraries print progress there.
proto = os.fdopen(os.dup(1), "w", buffering=1)
os.dup2(2, 1)

import espeakng_loader  # noqa: E402
import misaki.espeak  # noqa: E402,F401  (sets espeak paths on import; we fix the data path below)
from phonemizer.backend.espeak.wrapper import EspeakWrapper  # noqa: E402

# espeak-ng wants the folder *containing* espeak-ng-data, and silently ignores paths longer than
# ~160 characters (then fails on a path baked in at build time). Point it at a short symlink.
short = f"/tmp/kokoro-espeak-{os.getuid()}"
os.makedirs(short, exist_ok=True)
link = os.path.join(short, "espeak-ng-data")
if os.path.realpath(link) != os.path.realpath(espeakng_loader.get_data_path()):
    if os.path.lexists(link):
        os.remove(link)
    os.symlink(espeakng_loader.get_data_path(), link)
EspeakWrapper.set_data_path(short)

import numpy as np  # noqa: E402
from mlx_audio.tts.utils import load_model  # noqa: E402

model = load_model("mlx-community/Kokoro-82M-bf16")

for line in sys.stdin:
    try:
        req = json.loads(line)
        parts = [
            np.asarray(r.audio, dtype=np.float32).reshape(-1)
            for r in model.generate(text=req["text"], voice=req["voice"], speed=1.0, lang_code=req["voice"][0])
        ]
        audio = np.concatenate(parts) if parts else np.zeros(0, dtype=np.float32)
        audio.astype("<f4").tofile(req["out"])
        proto.write(json.dumps({"samples": int(audio.shape[0])}) + "\n")
    except Exception as err:  # noqa: BLE001 - report every failure to the caller
        proto.write(json.dumps({"error": f"{type(err).__name__}: {err}"}) + "\n")
