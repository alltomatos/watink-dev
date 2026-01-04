import { Response } from "express";

export const SendRefreshToken = (res: Response, token: string): void => {
  console.log("DEBUG: SendRefreshToken setting cookie 'jrt' for token ending in:", token.slice(-6));
  res.cookie("jrt", token, { httpOnly: true });
};
