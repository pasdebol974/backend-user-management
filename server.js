require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const cookieParser = require("cookie-parser");
const port = 5000;
const userRoutes = require("./routes/user.routes");

connectDB();
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use("/user", userRoutes);

// app.listen(port, () => {
//   console.log(`Server is running on port ${port}`);
// });

let server;

const startServer = async (port = process.env.PORT || 5000) => {
  await connectDB();
  server = app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
  return server;
};

const closeServer = async () => {
  if (server) {
    await server.close();
    const address = server.address();
    if (address) {
      console.log(`Server on port ${address.port} closed`);
    } else {
      console.log("Server closed");
    }
  }
};

module.exports = { app, startServer, closeServer };
