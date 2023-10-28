# Example

We use this example to showcase some features of the proxy library.

It includes an usage of the library with Elysia on the port 443, but also another server on the port 8000 that will be used for [tests](#tests).

## Tests

Inside the `public` directory, you'll find some HTML files that are used to test the proxy.

You can access them via the proxy server on <https://surfonxy.dev> just by using the `MTI3LjAuMC4xOjgwMDA=` origin (which is `127.0.0.1:8000` encoded in base64).

- [ ] `<iframe>` elements : [`/iframe.html`](./public/iframe.html) • [surfonxy.dev](https://surfonxy.dev/iframe.html?__surfonxy_url=MTI3LjAuMC4xOjgwMDA=)

## Build the `https` certificate for local `surfonxy.dev`

> Extracted from <https://web.dev/how-to-use-local-https/#running-your-site-locally-with-https-using-mkcert-recommended>
>
> Note that these steps needs to be done on the Windows side if you're running under WSL2.

First, install [`mkcert`](https://github.com/FiloSottile/mkcert/releases).

Run `mkcert -install` and restart your browser(s) if needed.

Then, we're going to add `surfonxy.dev` in our `/etc/hosts` file (or `C:\Windows\System32\drivers\etc\hosts` on Windows)

Here's a one-liner for Linux users :

```bash
echo "127.0.0.1 surfonxy.dev" | sudo tee -a /etc/hosts

# or this if you're already root, no sudo needed.
echo "127.0.0.1 surfonxy.dev" | tee -a /etc/hosts
```

Otherwise on Windows, you can open the file with Notepad (`notepad C:\Windows\System32\drivers\etc\hosts` in Administrator) and add the following line :

```hosts
127.0.0.1 surfonxy.dev
```

Finally, we're going to create a certificate for this host, using `mkcert surfonxy.dev`.

You'll see two new files in your current directory, `surfonxy.dev.pem` and `surfonxy.dev-key.pem`.

Move them in this `example` directory. On WSL2, you just drag the created certificates into the `example` folder.

You're now ready ! You can run `bun index.ts` and go to <https://surfonxy.dev> to see the test server running.

### `EADDRINUSE`

If you get this error :

```console
$ bun dev
EADDRINUSE: Failed to start server. Is port 443 in use?
 syscall: "listen"
```

You should run `sudo bun index.ts` to have the rights to use the port `443`.

## Run the example

Simply run `bun index.ts` or `sudo bun index.ts`, if needed, and go to <https://surfonxy.dev> to see the proxy server running.

You can also go to <http://localhost:8000> to see the test server ([`public` folder](./public/)) running without the proxy.
