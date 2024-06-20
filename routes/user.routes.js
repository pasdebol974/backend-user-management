const express = require("express");
const {
  setRegister,
  setLogin,
  setLogout,
  refreshToken,
  getUsers,
  authenticate,
  deleteUser,
  verifyEmail,
  requestEmailUpdate,
  confirmEmailUpdate,
  requestPasswordUpdate,
  confirmPasswordUpdate,
} = require("../controllers/user.controller");
const router = express.Router();

router.get("/", authenticate, getUsers);
router.post("/register", setRegister);
router.post("/login", setLogin);
router.post("/logout", setLogout);
router.post("/refresh-token", refreshToken);
router.get("/verify-email", verifyEmail);

router.put("/:id", authenticate);

router.delete("/:id", authenticate, deleteUser);

router.post("/request-email-update", authenticate, requestEmailUpdate);
router.get("/confirm-email-update", confirmEmailUpdate);

router.post("/request-password-update", authenticate, requestPasswordUpdate);
router.get("/confirm-password-update", confirmPasswordUpdate);

module.exports = router;
