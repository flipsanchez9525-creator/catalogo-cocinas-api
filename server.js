require("dotenv").config();

const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v22.0";
const META_CATALOG_ID = process.env.META_CATALOG_ID;
const META_CATALOG_TOKEN = process.env.META_CATALOG_TOKEN;

function validarConfig() {
  const faltantes = [];

  if (!META_CATALOG_ID) faltantes.push("META_CATALOG_ID");
  if (!META_CATALOG_TOKEN) faltantes.push("META_CATALOG_TOKEN");
  if (!META_GRAPH_VERSION) faltantes.push("META_GRAPH_VERSION");

  return faltantes;
}

app.get("/", (req, res) => {
  res.json({
    ok: true,
    mensaje: "API Catalogo Cocinas funcionando",
    catalog_id: META_CATALOG_ID || null,
    graph_version: META_GRAPH_VERSION
  });
});

app.get("/config-check", (req, res) => {
  const faltantes = validarConfig();

  res.json({
    ok: faltantes.length === 0,
    faltantes,
    catalog_id_configurado: Boolean(META_CATALOG_ID),
    token_configurado: Boolean(META_CATALOG_TOKEN && META_CATALOG_TOKEN !== "pendiente"),
    graph_version: META_GRAPH_VERSION
  });
});

app.get("/catalog-test", async (req, res) => {
  try {
    const faltantes = validarConfig();

    if (faltantes.length > 0 || META_CATALOG_TOKEN === "pendiente") {
      return res.status(400).json({
        ok: false,
        mensaje: "Falta configurar token real de Meta.",
        faltantes,
        token_actual: META_CATALOG_TOKEN === "pendiente" ? "pendiente" : "configurado"
      });
    }

    const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${META_CATALOG_ID}`;

    const response = await axios.get(url, {
      params: {
        fields: "id,name",
        access_token: META_CATALOG_TOKEN
      }
    });

    res.json({
      ok: true,
      catalogo: response.data
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: "Error consultando catalogo en Meta",
      error: error.response?.data || error.message
    });
  }
});

app.post("/crear-producto-prueba", async (req, res) => {
  try {
    if (!META_CATALOG_TOKEN || META_CATALOG_TOKEN === "pendiente") {
      return res.status(400).json({
        ok: false,
        mensaje: "Primero configura META_CATALOG_TOKEN con el token real."
      });
    }

    const producto = {
      id: "eaa73a16-f3c2-49c8-bfde-5580d1e7f104",
      title: "Cocina de empotrar 4Q a gas ALL BLACK SERIES",
      description:
        "Cocina de empotrar a gas con medidas de 59cm x 51cm, base de vidrio templado de 8mm, perillas metálicas, parrillas de hierro fundido, 4 quemadores a gas, chispero eléctrico 110V y garantía de 1 año.",
      availability: "in stock",
      condition: "new",
      price: "125.00 USD",
      link: "https://www.cocinasdeempotrar.com/product-page/cocina-de-empotrar-4q-a-gas-vidrio-templado-all-black-series",
      image_link: "https://static.wixstatic.com/media/a82c86_6dc2762a629842a4908bfb4ec0a76e46~mv2.jpeg/v1/fill/w_1182,h_666,al_c,q_85/a82c86_6dc2762a629842a4908bfb4ec0a76e46~mv2.jpeg",
      brand: "Cocinas de empotrar SV"
    };

    const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${META_CATALOG_ID}/items_batch`;

    const payload = {
      requests: [
        {
          method: "CREATE",
          retailer_id: producto.id,
          data: producto
        }
      ]
    };

    const response = await axios.post(url, payload, {
      params: {
        access_token: META_CATALOG_TOKEN
      }
    });

    res.json({
      ok: true,
      mensaje: "Producto de prueba enviado a Meta",
      producto,
      respuesta_meta: response.data
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: "Error creando producto de prueba",
      error: error.response?.data || error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor Catalogo API escuchando en puerto ${PORT}`);
});