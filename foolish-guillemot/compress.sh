#!/bin/bash

cd ../murrelet/examples/foolish_guillemot && wasm-pack build --dev --target web && cp pkg/foolish_guillemot_bg.wasm pkg/foolish_guillemot_bg_opt.wasm