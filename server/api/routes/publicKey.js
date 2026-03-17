// server/routes/publicKey.js
import express from "express";
import {publicKey} from "../../key.js";

const router = express.Router();

router.get("/public-key", (req, res) => {
  console.log("public-key");
  // Backward compatible response shape:
  // - legacy clients can read `data`
  // - newer clients can read `publicKey`
  return res.status(200).json({data: publicKey, publicKey});
});

export default router;
