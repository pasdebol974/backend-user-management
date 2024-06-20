const UserModel = require("../models/user.model");
const argon2 = require("argon2");
const validator = require("validator");
const jwt = require("jsonwebtoken");
const transporter = require("../config/mailer");

const accessTokenSecret = process.env.JWT_ACCESS_TOKEN_SECRET; // Utilise la clé secrète depuis les variables d'environnement
const refreshTokenSecret = process.env.JWT_REFRESH_TOKEN_SECRET; // Utilise une autre clé secrète pour les tokens de rafraîchissement
let refreshTokens = []; // Stockez les tokens de rafraîchissement, idéalement dans une base de données

module.exports.getUsers = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await UserModel.findById(userId);

    if (user.role === "admin") {
      const users = await UserModel.find();
      return res.status(200).json(users);
    } else {
      return res.status(200).json(user);
    }
  } catch (error) {
    console.error("Erreur lors de la récupération des utilisateurs :", error);
    res.status(500).json({ message: error.message });
  }
};

module.exports.setRegister = async (req, res) => {
  console.log("Register request body:", req.body);
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  if (!validator.isEmail(email)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  const passwordRequirements = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
  if (!passwordRequirements.test(password)) {
    return res.status(400).json({
      message:
        "Password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, and one number",
    });
  }

  try {
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already exists" });
    }

    const hashedPassword = await argon2.hash(password);

    const user = await UserModel.create({
      email,
      password: hashedPassword,
    });

    // Génération du token de validation
    const verificationToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_ACCESS_TOKEN_SECRET,
      { expiresIn: "1d" }
    );
    const verificationUrl = `http://localhost:5000/user/verify-email?token=${verificationToken}`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Bienvenue",
      text: `Merci de vous être inscrit !\nPour activer votre compte, veuillez cliquer sur le lien suivant : ${verificationUrl}`,
    };

    try {
      await transporter.sendMail(mailOptions);
      res.status(200).json({
        message: "Inscription réussie, veuillez vérifier votre email",
      });
    } catch (error) {
      console.error("Erreur lors de l'envoi du mail :", error);
      res.status(500).json({ message: "Erreur lors de l'envoi du mail" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports.setLogin = async (req, res) => {
  console.log("Login request body:", req.body);
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const user = await UserModel.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isPasswordValid = await argon2.verify(user.password, password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const accessToken = jwt.sign({ userId: user._id }, accessTokenSecret, {
      expiresIn: "1h",
    });
    const refreshToken = jwt.sign({ userId: user._id }, refreshTokenSecret, {
      expiresIn: "30d",
    });

    refreshTokens.push(refreshToken);

    res.cookie("token", accessToken, { httpOnly: true, secure: false });
    res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: false });

    res.status(200).json({ message: "Login successful" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports.setLogout = (req, res) => {
  const { refreshToken } = req.cookies;
  refreshTokens = refreshTokens.filter((token) => token !== refreshToken);
  res.clearCookie("token");
  res.clearCookie("refreshToken");
  res.status(200).json({ message: "Logout successful" });
};

module.exports.requestEmailUpdate = async (req, res) => {
  const { newEmail } = req.body;
  const userId = req.user.userId;

  if (!newEmail || !validator.isEmail(newEmail)) {
    return res.status(400).json({ message: "Invalid email format" });
  }

  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const emailUpdateToken = jwt.sign(
      { userId: user._id, newEmail },
      process.env.JWT_ACCESS_TOKEN_SECRET,
      { expiresIn: "1h" }
    );

    const emailUpdateUrl = `http://localhost:5000/user/confirm-email-update?token=${emailUpdateToken}`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email, // Envoyer à l'ancienne adresse email
      subject: "Confirmation de la mise à jour de l'email",
      text: `Pour confirmer la mise à jour de votre email, veuillez cliquer sur le lien suivant : ${emailUpdateUrl}. Si vous n'avez pas fait cette demande, ignorez cet email.`,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Email de confirmation envoyé" });
  } catch (error) {
    console.error("Erreur lors de l'envoi du mail :", error);
    res.status(500).json({ message: "Erreur lors de l'envoi du mail" });
  }
};

module.exports.confirmEmailUpdate = async (req, res) => {
  const { token } = req.query;

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET);
    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.email = decoded.newEmail;
    await user.save();

    // Envoyer un email de confirmation à la nouvelle adresse email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Email mis à jour avec succès",
      text: "Votre adresse email a été mise à jour avec succès.",
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Email mis à jour avec succès" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports.requestPasswordUpdate = async (req, res) => {
  const { newPassword } = req.body;
  const userId = req.user.userId;

  const passwordRequirements = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
  if (!passwordRequirements.test(newPassword)) {
    return res.status(400).json({
      message:
        "New password must be at least 8 characters long and include at least one uppercase letter, one lowercase letter, and one number",
    });
  }

  try {
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const passwordUpdateToken = jwt.sign(
      { userId: user._id, newPassword },
      process.env.JWT_ACCESS_TOKEN_SECRET,
      { expiresIn: "1h" }
    );

    const passwordUpdateUrl = `http://localhost:5000/user/confirm-password-update?token=${passwordUpdateToken}`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Confirmation de la mise à jour du mot de passe",
      text: `Pour confirmer la mise à jour de votre mot de passe, veuillez cliquer sur le lien suivant : ${passwordUpdateUrl}. Si vous n'avez pas fait cette demande, ignorez cet email.`,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Email de confirmation envoyé" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports.confirmPasswordUpdate = async (req, res) => {
  const { token } = req.query;

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET);
    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const hashedPassword = await argon2.hash(decoded.newPassword);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: "Mot de passe mis à jour avec succès" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports.refreshToken = (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    return res.status(403).json({ message: "Refresh token is required" });
  }

  if (!refreshTokens.includes(refreshToken)) {
    return res.status(403).json({ message: "Invalid refresh token" });
  }

  try {
    const user = jwt.verify(refreshToken, refreshTokenSecret);
    const newAccessToken = jwt.sign(
      { userId: user.userId },
      accessTokenSecret,
      { expiresIn: "1h" }
    );
    res.cookie("token", newAccessToken, { httpOnly: true, secure: false });
    res.status(200).json({ message: "Token refreshed" });
  } catch (error) {
    return res.status(403).json({ message: "Invalid refresh token" });
  }
};

module.exports.authenticate = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, accessTokenSecret);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
  }
};

module.exports.deleteUser = async (req, res) => {
  console.log("Delete user params:", req.params);
  try {
    const userId = req.params.id;
    const deletedUser = await UserModel.findByIdAndDelete(userId);
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json({ message: `User ${userId} deleted` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports.verifyEmail = async (req, res) => {
  const { token } = req.query;

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET);
    const user = await UserModel.findById(decoded.userId);
    if (!user) {
      return res.status(400).json({ message: "Invalid token" });
    }

    user.isVerified = true;
    user.verificationToken = null;
    await user.save();

    res.status(200).json({ message: "Email vérifié avec succès" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
