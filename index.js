const express = require("express");
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");
const app = express();



app.use(cors());
app.use(express.json());
const listenerRoutes = require("./Routes/listenerRoutes");

app.get("/", (req, res) => {
  res.send("EchoStream backend is running!");
});

const PORT = process.env.PORT || 2010;
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully!");

    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
  });
