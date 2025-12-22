import { Request, Response } from "express";
import path from "path";
import fs from "fs";

import { getIO } from "../libs/socket";
import AppError from "../errors/AppError";

import UpdateSettingService from "../services/SettingServices/UpdateSettingService";
import ListSettingsService from "../services/SettingServices/ListSettingsService";

export const index = async (req: Request, res: Response): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const settings = await ListSettingsService();

  return res.status(200).json(settings);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }
  const { settingKey: key } = req.params;
  const { value } = req.body;

  const setting = await UpdateSettingService({
    key,
    value
  });

  const io = getIO();
  io.emit("settings", {
    action: "update",
    setting
  });

  return res.status(200).json(setting);
};

export const uploadLogo = async (
  req: Request,
  res: Response
): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  if (!req.file) {
    throw new AppError("ERR_NO_FILE_UPLOADED", 400);
  }

  const file = req.file;
  const publicDir = path.resolve(__dirname, "..", "..", "public");

  // Create public directory if it doesn't exist
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  // Generate unique filename
  const ext = path.extname(file.originalname);
  const filename = `logo-${Date.now()}${ext}`;
  const filepath = path.join(publicDir, filename);

  // Move file to public directory
  fs.writeFileSync(filepath, file.buffer);

  // Build logo URL (without leading slash to avoid double slash when combined with backend URL)
  const logoUrl = `public/${filename}`;

  // Update setting
  const setting = await UpdateSettingService({
    key: "systemLogo",
    value: logoUrl
  });

  const io = getIO();
  io.emit("settings", {
    action: "update",
    setting
  });

  return res.status(200).json({ logoUrl });
};

export const uploadFavicon = async (
  req: Request,
  res: Response
): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  if (!req.file) {
    throw new AppError("ERR_NO_FILE_UPLOADED", 400);
  }

  const file = req.file;
  const publicDir = path.resolve(__dirname, "..", "..", "public");

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const ext = path.extname(file.originalname);
  const filename = `favicon-${Date.now()}${ext}`;
  const filepath = path.join(publicDir, filename);

  fs.writeFileSync(filepath, file.buffer);

  const faviconUrl = `public/${filename}`;

  const setting = await UpdateSettingService({
    key: "systemFavicon",
    value: faviconUrl
  });

  const io = getIO();
  io.emit("settings", {
    action: "update",
    setting
  });

  return res.status(200).json({ faviconUrl });
};

export const uploadLoginImage = async (
  req: Request,
  res: Response
): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  if (!req.file) {
    throw new AppError("ERR_NO_FILE_UPLOADED", 400);
  }

  const file = req.file;
  const publicDir = path.resolve(__dirname, "..", "..", "public");

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const ext = path.extname(file.originalname);
  const filename = `loginImage-${Date.now()}${ext}`;
  const filepath = path.join(publicDir, filename);

  fs.writeFileSync(filepath, file.buffer);

  const imageUrl = `public/${filename}`;

  const setting = await UpdateSettingService({
    key: "login_backgroundImage",
    value: imageUrl
  });

  const io = getIO();
  io.emit("settings", {
    action: "update",
    setting
  });

  return res.status(200).json({ imageUrl });
};
