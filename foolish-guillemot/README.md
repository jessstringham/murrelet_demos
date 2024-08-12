
the web part of the code that's running here: (https://www.thisxorthat.art/live/foolish-guillemot/)

# Quick(?) Start!

(sorry not a docker image yet or anything. in the meantime..)

install Rust in your favorite way (https://www.rust-lang.org/learn/get-started)

I'm using submodules to include the Rust code from the [main murrelet repository](https://github.com/jessstringham/murrelet), so make sure you have those downloaded `git submodule update --init --recursive`.

you might need to `cargo install wasm-pack`.

compile the rust code and pack it. I include the code I use for this in `compress.sh`.

run `npm install`

run `npm run build` to generate the js that squishes the wasm and main.js together.

run `npm run start` to start the webserver

(I usually do something like `sh compress.sh && npm run build && npm run start`. if you're actively developing the rust code, you can also set up something to watch that directory and run compress.sh and npm run build).
