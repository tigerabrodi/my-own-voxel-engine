import { initWebGLCanvas, resizeCanvasToDisplaySize } from "./webgl/context";

function main() {
  const { gl, canvas } = initWebGLCanvas("glcanvas");

  function render() {
    const resized = resizeCanvasToDisplaySize(canvas);
    if (resized) {
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    gl.clearColor(0.07, 0.09, 0.12, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    requestAnimationFrame(render);
  }

  gl.enable(gl.DEPTH_TEST);
  render();
}

main();
