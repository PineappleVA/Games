/* Servidor de vista previa del sitio: npm run serve
   ------------------------------------------------------------
   Sirve el repo como lo hará GitHub Pages para poder mirarlo en el
   navegador antes de publicar. Escucha en 0.0.0.0 para que la vista
   previa del entorno lo pueda mostrar. */

import { startServer } from './server.mjs';

const port = Number(process.env.PORT || 8080);

startServer({ port, host: '0.0.0.0' }).then((server) => {
  console.log('🍍 Pineapple Games — vista previa');
  console.log(`   http://localhost:${server.port}/`);
  console.log('   (Ctrl+C para parar)');
});
