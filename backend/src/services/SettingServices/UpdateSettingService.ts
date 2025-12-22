import AppError from "../../errors/AppError";
import Setting from "../../models/Setting";

interface Request {
  key: string;
  value: string;
}

const UpdateSettingService = async ({
  key,
  value
}: Request): Promise<Setting | undefined> => {
  let setting = await Setting.findOne({
    where: { key }
  });

  if (!setting) {
    setting = await Setting.create({ key, value });
  } else {
    await setting.update({ value });
  }

  return setting;
};

export default UpdateSettingService;
