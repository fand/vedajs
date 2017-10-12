<div align="center">
  <img alt="logo" src="https://user-images.githubusercontent.com/1403842/28923702-d8155d46-7899-11e7-817b-1193d138e5b8.png" width="192"/>
</div>

<div align="center">
  <h1>VEDA</h1>
  <i>Shader Art Framework</i>
  <br>
  <br>
  <br>
  <img alt="screenshot" src="https://user-images.githubusercontent.com/1403842/28673275-1d42b062-731d-11e7-92b0-bde5ca1f1cae.gif" style="width: 100% !important;"/>
  <br>
  <br>
</div>

<div align="center">

![npm version](https://img.shields.io/npm/v/vedajs.svg)
![license MIT](https://img.shields.io/npm/l/vedajs.svg)
[![hashtag #vedajs](https://img.shields.io/badge/hashtag-vedajs-blue.svg)](https://twitter.com/search?f=tweets&q=%23vedajs&src=typd)
</div>
<br>
<br>



## Install

```
npm install vedajs
```


## Usage

```js
import Veda from 'vedajs';

const veda = new Veda();

veda.setCanvas(canvas);
veda.loadShader([{
  fs: fragmentShaderCode,
}]);

veda.play();
```

See [examples](./examples) for details.


## Author

Takayosi Amagi

- Website: [gmork.in](https://gmork.in)
- Twitter: [@amagitakayosi](https://twitter.com/amagitakayosi)
- GitHub: [fand](https://github.com/fand)


## LICENSE

MIT
