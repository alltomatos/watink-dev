import { Response } from "express";

export const SendRefreshToken = (res: Response, token: string): void => {
  const frontendUrl = process.env.FRONTEND_URL || "";
  const isHttps = frontendUrl.startsWith("https://");

  // If HTTPS, use sameSite: 'none' and secure: true (required for cross-site cookies)
  // If HTTP, use sameSite: 'lax' and secure: false (allows same-site cookies)
  const cookieOptions: any = {
    httpOnly: true,
    sameSite: isHttps ? "none" : "lax",
    secure: isHttps,
  };

  if (!isHttps && frontendUrl.includes("localhost")) {
      // Allow sharing cookies across localhost subdomains if needed
      // cookieOptions.domain = "localhost"; 
  }


  res.cookie("jrt", token, cookieOptions);
};
