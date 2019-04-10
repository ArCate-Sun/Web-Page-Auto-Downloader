let ua = "Mozilla/5.0 (Linux; Android 5.0; SM-G900P Build/LRX21T) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/73.0.3683.86 Mobile Safari/537.36";
let desc = "mobile mode user agent";

Object.defineProperty(navigator, 'userAgent', {
    value: ua
});

console.log("inject")