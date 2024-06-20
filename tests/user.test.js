const request = require("supertest");
const { app, startServer, closeServer } = require("../server");
const UserModel = require("../models/user.model");
const argon2 = require("argon2");
const jwt = require("jsonwebtoken");

let server;

describe("User Routes", () => {
  beforeAll(async () => {
    server = await startServer(4000); // Utiliser un port différent pour les tests
  });

  afterAll(async () => {
    await closeServer();
  });

  describe("POST /user/register", () => {
    it("should register a new user", async () => {
      const response = await request(app).post("/user/register").send({
        email: "test@example.com",
        password: "Password123!",
      });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe(
        "Inscription réussie, veuillez vérifier votre email"
      );
    });

    it("should not register a user with an invalid email", async () => {
      const response = await request(app).post("/user/register").send({
        email: "invalid-email",
        password: "Password123!",
      });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid email format");
    });
  });

  describe("POST /user/login", () => {
    beforeAll(async () => {
      const user = new UserModel({
        email: "login@example.com",
        password: await argon2.hash("Password123!"),
      });
      await user.save();
    });

    it("should log in a user", async () => {
      const response = await request(app).post("/user/login").send({
        email: "login@example.com",
        password: "Password123!",
      });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Login successful");
    });

    it("should not log in a user with wrong password", async () => {
      const response = await request(app).post("/user/login").send({
        email: "login@example.com",
        password: "WrongPassword",
      });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("Invalid email or password");
    });
  });

  describe("POST /user/logout", () => {
    let refreshToken;

    beforeAll(async () => {
      const user = new UserModel({
        email: "logout@example.com",
        password: await argon2.hash("Password123!"),
      });
      await user.save();

      const loginResponse = await request(app).post("/user/login").send({
        email: "logout@example.com",
        password: "Password123!",
      });

      refreshToken = loginResponse.headers["set-cookie"][1]
        .split(";")[0]
        .split("=")[1];
    });

    it("should log out a user", async () => {
      const response = await request(app)
        .post("/user/logout")
        .set("Cookie", [`refreshToken=${refreshToken}`]);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Logout successful");
    });
  });

  describe("POST /user/refresh-token", () => {
    let refreshToken;

    beforeAll(async () => {
      const user = new UserModel({
        email: "refresh@example.com",
        password: await argon2.hash("Password123!"),
      });
      await user.save();

      const loginResponse = await request(app).post("/user/login").send({
        email: "refresh@example.com",
        password: "Password123!",
      });

      refreshToken = loginResponse.headers["set-cookie"][1]
        .split(";")[0]
        .split("=")[1];
    });

    it("should refresh the token", async () => {
      const response = await request(app)
        .post("/user/refresh-token")
        .set("Cookie", [`refreshToken=${refreshToken}`]);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Token refreshed");
    });
  });

  describe("GET /user/verify-email", () => {
    let verificationToken;

    beforeAll(async () => {
      const user = new UserModel({
        email: "verify@example.com",
        password: await argon2.hash("Password123!"),
      });
      await user.save();

      verificationToken = jwt.sign(
        { userId: user._id },
        process.env.JWT_ACCESS_TOKEN_SECRET,
        { expiresIn: "1d" }
      );
    });

    it("should verify the email", async () => {
      const response = await request(app).get(
        `/user/verify-email?token=${verificationToken}`
      );

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Email vérifié avec succès");
    });
  });

  describe("POST /user/request-email-update", () => {
    let user, token;

    beforeAll(async () => {
      user = new UserModel({
        email: "old@example.com",
        password: await argon2.hash("Password123!"),
      });
      await user.save();

      token = jwt.sign(
        { userId: user._id },
        process.env.JWT_ACCESS_TOKEN_SECRET,
        { expiresIn: "1d" }
      );
    });

    it("should request an email update", async () => {
      const response = await request(app)
        .post("/user/request-email-update")
        .set("Cookie", [`token=${token}`])
        .send({
          newEmail: "new@example.com",
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Email de confirmation envoyé");
    });
  });

  describe("GET /user/confirm-email-update", () => {
    let emailUpdateToken;

    beforeAll(async () => {
      const user = new UserModel({
        email: "confirm@example.com",
        password: await argon2.hash("Password123!"),
      });
      await user.save();

      emailUpdateToken = jwt.sign(
        { userId: user._id, newEmail: "newconfirm@example.com" },
        process.env.JWT_ACCESS_TOKEN_SECRET,
        { expiresIn: "1d" }
      );
    });

    it("should confirm the email update", async () => {
      const response = await request(app).get(
        `/user/confirm-email-update?token=${emailUpdateToken}`
      );

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Email mis à jour avec succès");
    });
  });

  describe("POST /user/request-password-update", () => {
    let user, token;

    beforeAll(async () => {
      user = new UserModel({
        email: "password@example.com",
        password: await argon2.hash("Password123!"),
      });
      await user.save();

      token = jwt.sign(
        { userId: user._id },
        process.env.JWT_ACCESS_TOKEN_SECRET,
        { expiresIn: "1d" }
      );
    });

    it("should request a password update", async () => {
      const response = await request(app)
        .post("/user/request-password-update")
        .set("Cookie", [`token=${token}`])
        .send({
          newPassword: "NewPassword123!",
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Email de confirmation envoyé");
    });
  });

  describe("GET /user/confirm-password-update", () => {
    let passwordUpdateToken;

    beforeAll(async () => {
      const user = new UserModel({
        email: "passwordconfirm@example.com",
        password: await argon2.hash("Password123!"),
      });
      await user.save();

      passwordUpdateToken = jwt.sign(
        { userId: user._id, newPassword: "NewPassword123!" },
        process.env.JWT_ACCESS_TOKEN_SECRET,
        { expiresIn: "1d" }
      );
    });

    it("should confirm the password update", async () => {
      const response = await request(app).get(
        `/user/confirm-password-update?token=${passwordUpdateToken}`
      );

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Mot de passe mis à jour avec succès");
    });
  });

  describe("GET /user", () => {
    let token, user;

    beforeAll(async () => {
      user = new UserModel({
        email: "admin@example.com",
        password: await argon2.hash("Password123!"),
        role: "admin",
      });
      await user.save();

      token = jwt.sign(
        { userId: user._id },
        process.env.JWT_ACCESS_TOKEN_SECRET,
        { expiresIn: "1d" }
      );
    });

    it("should get all users if admin", async () => {
      const response = await request(app)
        .get("/user")
        .set("Cookie", [`token=${token}`]);

      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe("DELETE /user/:id", () => {
    let token, user, userToDelete;

    beforeAll(async () => {
      user = new UserModel({
        email: "admin@example.com",
        password: await argon2.hash("Password123!"),
        role: "admin",
      });
      await user.save();

      userToDelete = new UserModel({
        email: "delete@example.com",
        password: await argon2.hash("Password123!"),
      });
      await userToDelete.save();

      token = jwt.sign(
        { userId: user._id },
        process.env.JWT_ACCESS_TOKEN_SECRET,
        { expiresIn: "1d" }
      );
    });

    it("should delete a user if admin", async () => {
      const response = await request(app)
        .delete(`/user/${userToDelete._id}`)
        .set("Cookie", [`token=${token}`]);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe(`User ${userToDelete._id} deleted`);
    });
  });
});
