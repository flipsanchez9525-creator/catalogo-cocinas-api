require("dotenv").config();

const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v22.0";
const META_CATALOG_ID = process.env.META_CATALOG_ID;
const META_CATALOG_TOKEN = process.env.META_CATALOG_TOKEN;
const API_SECRET = process.env.API_SECRET;

function validarConfig() {
  const faltantes = [];

  if (!META_CATALOG_ID) faltantes.push("META_CATALOG_ID");
  if (!META_CATALOG_TOKEN) faltantes.push("META_CATALOG_TOKEN");
  if (!META_GRAPH_VERSION) faltantes.push("META_GRAPH_VERSION");

  return faltantes;
}

function validarApiSecret(req, res, next) {
  if (!API_SECRET) {
    return res.status(500).json({
      ok: false,
      mensaje: "API_SECRET no está configurado en el servidor."
    });
  }

  const recibido = req.headers["x-api-secret"];

  if (!recibido || recibido !== API_SECRET) {
    return res.status(401).json({
      ok: false,
      mensaje: "No autorizado. Falta o es incorrecto el x-api-secret."
    });
  }

  next();
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
  item_type: "PRODUCT_ITEM",
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

app.post("/producto", validarApiSecret, async (req, res) => {
  try {
    if (!META_CATALOG_TOKEN || META_CATALOG_TOKEN === "pendiente") {
      return res.status(400).json({
        ok: false,
        mensaje: "Primero configura META_CATALOG_TOKEN con el token real."
      });
    }

    const producto = req.body;

    const camposObligatorios = [
      "id",
      "title",
      "description",
      "availability",
      "condition",
      "price",
      "link",
      "image_link",
      "brand"
    ];

    const faltantes = camposObligatorios.filter((campo) => !producto[campo]);

    if (faltantes.length > 0) {
      return res.status(400).json({
        ok: false,
        mensaje: "Faltan campos obligatorios.",
        faltantes
      });
    }

    const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${META_CATALOG_ID}/items_batch`;

    const payload = {
      item_type: "PRODUCT_ITEM",
      requests: [
        {
          method: "UPDATE",
          retailer_id: producto.id,
          data: {
            id: producto.id,
            title: producto.title,
            description: producto.description,
            availability: producto.availability,
            condition: producto.condition,
            price: producto.price,
            link: producto.link,
            image_link: producto.image_link,
            brand: producto.brand,
            item_group_id: producto.item_group_id || producto.id,
            google_product_category: producto.google_product_category || undefined,
            sale_price: producto.sale_price || undefined,
            additional_image_link: producto.additional_image_link || undefined,
            custom_label_0: producto.custom_label_0 || undefined,
            custom_label_1: producto.custom_label_1 || undefined,
            custom_label_2: producto.custom_label_2 || undefined,
            custom_label_3: producto.custom_label_3 || undefined,
            custom_label_4: producto.custom_label_4 || undefined
          }
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
      mensaje: "Producto enviado a Meta correctamente",
      producto_enviado: producto,
      respuesta_meta: response.data
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      mensaje: "Error enviando producto a Meta",
      error: error.response?.data || error.message
    });
  }
});

app.post("/productos-batch", validarApiSecret, async (req, res) => {
  
  let productos = [];

  try {
    if (!META_CATALOG_TOKEN || META_CATALOG_TOKEN === "pendiente") {
      return res.status(400).json({
        ok: false,
        mensaje: "Primero configura META_CATALOG_TOKEN con el token real."
      });
    }

    productos = req.body.productos;

    console.log("🔥 /productos-batch recibido:", {
      total: Array.isArray(productos) ? productos.length : null,
      ids: Array.isArray(productos) ? productos.map((p) => p.id) : null,
      fecha: new Date().toISOString()
    });

    if (!Array.isArray(productos) || productos.length === 0) {
      return res.status(400).json({
        ok: false,
        mensaje: "Debes enviar un arreglo de productos en el campo productos."
      });
    }

    const camposObligatorios = [
      "id",
      "title",
      "description",
      "availability",
      "condition",
      "price",
      "link",
      "image_link",
      "brand"
    ];

    const errores = [];

    productos.forEach((producto, index) => {
      const faltantes = camposObligatorios.filter((campo) => !producto[campo]);

      if (faltantes.length > 0) {
        errores.push({
          index,
          id: producto.id || null,
          title: producto.title || null,
          faltantes
        });
      }
    });

    if (errores.length > 0) {
      console.error("❌ Productos con campos faltantes:", errores);

      return res.status(400).json({
        ok: false,
        mensaje: "Algunos productos tienen campos faltantes.",
        errores
      });
    }

    const requests = productos.map((producto) => {
      const data = {
        id: producto.id,
        title: producto.title,
        description: producto.description,
        availability: producto.availability,
        condition: producto.condition,
        price: producto.price,
        link: producto.link,
        image_link: producto.image_link,
        brand: producto.brand,
        item_group_id: producto.item_group_id || producto.id,
        google_product_category: producto.google_product_category || undefined,
        sale_price: producto.sale_price || undefined,
        custom_label_0: producto.custom_label_0 || undefined,
        custom_label_1: producto.custom_label_1 || undefined,
        custom_label_2: producto.custom_label_2 || undefined,
        custom_label_3: producto.custom_label_3 || undefined,
        custom_label_4: producto.custom_label_4 || undefined
      };

      if (
        Array.isArray(producto.additional_image_link) &&
        producto.additional_image_link.length > 0
      ) {
        data.additional_image_link = producto.additional_image_link;
      }

      return {
        method: "UPDATE",
        retailer_id: producto.id,
        data
      };
    });

    const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${META_CATALOG_ID}/items_batch`;

    const payload = {
      item_type: "PRODUCT_ITEM",
      requests
    };

    console.log("📤 Enviando lote a Meta:", {
      total: productos.length,
      ids: productos.map((p) => p.id),
      imagenesAdicionales: productos.map((p) => ({
        id: p.id,
        total: Array.isArray(p.additional_image_link)
          ? p.additional_image_link.length
          : 0
      }))
    });

    const response = await axios.post(url, payload, {
      params: {
        access_token: META_CATALOG_TOKEN
      }
    });

    console.log("✅ Respuesta Meta /productos-batch:", {
      status: response.status,
      handles: response.data?.handles || null,
      data: response.data
    });

    res.json({
      ok: true,
      mensaje: "Lote de productos enviado a Meta correctamente",
      total_enviados: productos.length,
      ids: productos.map((p) => p.id),
      respuesta_meta: response.data
    });
  } catch (error) {
    console.error("❌ ERROR EN /productos-batch:", {
      message: error.message,
      responseStatus: error.response?.status,
      responseData: error.response?.data,
      productos: Array.isArray(productos)
        ? productos.map((p) => ({
            id: p.id,
            title: p.title,
            image_link: p.image_link,
            adicionales: Array.isArray(p.additional_image_link)
              ? p.additional_image_link.length
              : 0
          }))
        : null,
      stack: error.stack
    });

    res.status(500).json({
      ok: false,
      mensaje: "Error enviando lote de productos a Meta",
      error: error.message,
      meta_status: error.response?.status || null,
      meta_error: error.response?.data || null,
      productos: Array.isArray(productos)
        ? productos.map((p) => ({
            id: p.id,
            title: p.title,
            adicionales: Array.isArray(p.additional_image_link)
              ? p.additional_image_link.length
              : 0
          }))
        : null
    });
  }
});

async function dormir(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function enviarLoteAMeta(productos) {
  const requests = productos.map((producto) => {
    const data = {
      id: producto.id,
      title: producto.title,
      description: producto.description,
      availability: producto.availability,
      condition: producto.condition,
      price: producto.price,
      link: producto.link,
      image_link: producto.image_link,
      brand: producto.brand,
      item_group_id: producto.item_group_id || producto.id,
      google_product_category: producto.google_product_category || undefined,
      sale_price: producto.sale_price || undefined,
      custom_label_0: producto.custom_label_0 || undefined,
      custom_label_1: producto.custom_label_1 || undefined,
      custom_label_2: producto.custom_label_2 || undefined,
      custom_label_3: producto.custom_label_3 || undefined,
      custom_label_4: producto.custom_label_4 || undefined
    };

    if (
      Array.isArray(producto.additional_image_link) &&
      producto.additional_image_link.length > 0
    ) {
      data.additional_image_link = producto.additional_image_link;
    }

    return {
      method: "UPDATE",
      retailer_id: producto.id,
      data
    };
  });

  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${META_CATALOG_ID}/items_batch`;

  const payload = {
    item_type: "PRODUCT_ITEM",
    requests
  };

  const response = await axios.post(url, payload, {
    params: {
      access_token: META_CATALOG_TOKEN
    }
  });

  return response.data;
}

async function procesarProductosAsync(productos, jobId) {
  try {
    console.log("🚀 SINCRONIZACIÓN ASYNC INICIADA:", {
      jobId,
      totalProductos: productos.length,
      fecha: new Date().toISOString()
    });

    const tamanoLote = 10;
    const pausaEntreLotesMs = 8000;
    const lotes = [];

    for (let i = 0; i < productos.length; i += tamanoLote) {
      lotes.push(productos.slice(i, i + tamanoLote));
    }

    console.log("📦 Lotes preparados:", {
      jobId,
      totalLotes: lotes.length,
      tamanoLote
    });

    for (let i = 0; i < lotes.length; i++) {
      const lote = lotes[i];

      console.log(`📤 ASYNC enviando lote ${i + 1} de ${lotes.length}:`, {
        jobId,
        total: lote.length,
        ids: lote.map((p) => p.id)
      });

      try {
        const respuestaMeta = await enviarLoteAMeta(lote);

        console.log(`✅ ASYNC lote ${i + 1} enviado correctamente:`, {
          jobId,
          lote: i + 1,
          totalLotes: lotes.length,
          respuestaMeta
        });
      } catch (error) {
        console.error(`❌ ASYNC error en lote ${i + 1}:`, {
          jobId,
          lote: i + 1,
          message: error.message,
          responseStatus: error.response?.status,
          responseData: error.response?.data,
          productos: lote.map((p) => ({
            id: p.id,
            title: p.title,
            adicionales: Array.isArray(p.additional_image_link)
              ? p.additional_image_link.length
              : 0
          }))
        });
      }

      if (i < lotes.length - 1) {
        console.log(`⏳ ASYNC esperando ${pausaEntreLotesMs / 1000} segundos antes del siguiente lote...`, {
          jobId
        });

        await dormir(pausaEntreLotesMs);
      }
    }

    console.log("🏁 SINCRONIZACIÓN ASYNC FINALIZADA:", {
      jobId,
      totalProductos: productos.length,
      totalLotes: lotes.length,
      fecha: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ ERROR GENERAL EN SINCRONIZACIÓN ASYNC:", {
      jobId,
      message: error.message,
      stack: error.stack
    });
  }
}

app.post("/sincronizar-productos-async", validarApiSecret, async (req, res) => {
  try {
    if (!META_CATALOG_TOKEN || META_CATALOG_TOKEN === "pendiente") {
      return res.status(400).json({
        ok: false,
        mensaje: "Primero configura META_CATALOG_TOKEN con el token real."
      });
    }

    const productos = req.body.productos;

    if (!Array.isArray(productos) || productos.length === 0) {
      return res.status(400).json({
        ok: false,
        mensaje: "Debes enviar un arreglo de productos en el campo productos."
      });
    }

    const jobId = `sync_${Date.now()}`;

    console.log("📥 Solicitud async recibida:", {
      jobId,
      totalProductos: productos.length,
      ids: productos.map((p) => p.id),
      fecha: new Date().toISOString()
    });

    res.json({
      ok: true,
      mensaje: "Sincronización recibida. Railway procesará los lotes en segundo plano.",
      jobId,
      totalProductos: productos.length
    });

    setImmediate(() => {
      procesarProductosAsync(productos, jobId);
    });
  } catch (error) {
    console.error("❌ ERROR EN /sincronizar-productos-async:", {
      message: error.message,
      responseStatus: error.response?.status,
      responseData: error.response?.data,
      stack: error.stack
    });

    res.status(500).json({
      ok: false,
      mensaje: "Error iniciando sincronización async",
      error: error.message
    });
  }
});

app.post("/webhook-wix-producto", async (req, res) => {
  try {
    console.log("📦 Webhook Wix recibido:");
    console.log(JSON.stringify(req.body, null, 2));

    res.json({
      ok: true,
      mensaje: "Webhook de Wix recibido correctamente",
      recibido: req.body
    });
  } catch (error) {
    console.error("Error en webhook Wix:", error);

    res.status(500).json({
      ok: false,
      mensaje: "Error procesando webhook de Wix",
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor Catalogo API escuchando en puerto ${PORT}`);
});