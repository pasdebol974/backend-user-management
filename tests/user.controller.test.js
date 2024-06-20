const userController = require("../controllers/user.controller");
const UserModel = require("../models/user.model");
const argon2 = require("argon2");
const jwt = require("jsonwebtoken");
const transporter = require("../config/mailer");

jest.mock("../models/user.model");
jest.mock("argon2");
jest.mock("jsonwebtoken");
jest.mock("../config/mailer");

describe("User Controller", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("setRegister", () => {
    it("should register a new user", async () => {
      const req = {
        body: {
          email: "test@example.com",
          password: "Password123!",
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      UserModel.findOne.mockResolvedValue(null);
      argon2.hash.mockResolvedValue("hashedPassword");
      UserModel.create.mockResolvedValue({
        _id: "userId",
        email: "test@example.com",
        password: "hashedPassword",
      });
      jwt.sign.mockReturnValue("verificationToken");
      transporter.sendMail.mockResolvedValue({});

      await userController.setRegister(req, res);

      expect(UserModel.findOne).toHaveBeenCalledWith({
        email: "test@example.com",
      });
      expect(argon2.hash).toHaveBeenCalledWith("Password123!");
      expect(UserModel.create).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "hashedPassword",
      });
      expect(jwt.sign).toHaveBeenCalled();
      expect(transporter.sendMail).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Inscription réussie, veuillez vérifier votre email",
      });
    });

    it("should not register a user with an existing email", async () => {
      const req = {
        body: {
          email: "test@example.com",
          password: "Password123!",
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      UserModel.findOne.mockResolvedValue({ email: "test@example.com" });

      await userController.setRegister(req, res);

      expect(UserModel.findOne).toHaveBeenCalledWith({
        email: "test@example.com",
      });
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        message: "Email already exists",
      });
    });
  });

  describe("setLogin", () => {
    it("should log in a user with valid credentials", async () => {
      const req = {
        body: {
          email: "login@example.com",
          password: "Password123!",
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        cookie: jest.fn(),
      };

      UserModel.findOne.mockResolvedValue({
        _id: "userId",
        email: "login@example.com",
        password: "hashedPassword",
      });
      argon2.verify.mockResolvedValue(true);
      jwt.sign
        .mockReturnValueOnce("accessToken")
        .mockReturnValueOnce("refreshToken");

      await userController.setLogin(req, res);

      expect(UserModel.findOne).toHaveBeenCalledWith({
        email: "login@example.com",
      });
      expect(argon2.verify).toHaveBeenCalledWith(
        "hashedPassword",
        "Password123!"
      );
      expect(jwt.sign).toHaveBeenCalledTimes(2);
      expect(res.cookie).toHaveBeenCalledWith("token", "accessToken", {
        httpOnly: true,
        secure: false,
      });
      expect(res.cookie).toHaveBeenCalledWith("refreshToken", "refreshToken", {
        httpOnly: true,
        secure: false,
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: "Login successful" });
    });

    it("should not log in a user with invalid credentials", async () => {
      const req = {
        body: {
          email: "login@example.com",
          password: "WrongPassword",
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      UserModel.findOne.mockResolvedValue({
        _id: "userId",
        email: "login@example.com",
        password: "hashedPassword",
      });
      argon2.verify.mockResolvedValue(false);

      await userController.setLogin(req, res);

      expect(UserModel.findOne).toHaveBeenCalledWith({
        email: "login@example.com",
      });
      expect(argon2.verify).toHaveBeenCalledWith(
        "hashedPassword",
        "WrongPassword"
      );
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        message: "Invalid email or password",
      });
    });
  });
});
