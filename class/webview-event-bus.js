class WebViewEventBus {
  constructor() {
    this._callbackId = 0;
    this._pending = {};
  }

  setWebViewRef(webViewRef) {
    this._webViewRef = webViewRef;
  }

  exec(method, args) {
    return new Promise((resolve, reject) => {
      this._callbackId = String(Number(this._callbackId) + 1);
      this._pending[this._callbackId] = { resolve, reject };
      this._webViewRef.current.postMessage(
        JSON.stringify({
          callbackId: this._callbackId,
          method,
          args: args.map((i) => {
            if (i instanceof Uint8Array) {
              return Array.from(i);
            }
            if (typeof i === 'bigint') {
              return String(i);
            }
            return i;
          }),
        }),
      );
    });
  }

  onMessage(e) {
    const data = JSON.parse(e.nativeEvent.data);
    const { type, error, result, callbackId, method } = data;

    const defer = this._pending[callbackId];
    if (!defer) {
      console.error('unmatched calback');
      return;
    }

    delete this._pending[callbackId];
    if (error) {
      console.error('onMessage', method, error);
      defer.reject(new Error(error.message));
    } else {
      defer.resolve(result);
    }
  }
}

const webViewEventBus = new WebViewEventBus();

export default webViewEventBus;
