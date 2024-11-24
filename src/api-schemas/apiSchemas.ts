import { Joi } from "express-validation";

export const downloadValidation = {
    body: Joi.object({
        url: Joi.string().uri().required(),
    }),
};

const uuidPathValidation = {
    params: Joi.object({
        id: Joi.string().uuid().required(),
    }),
};

export const statusValidation = uuidPathValidation;
export const abortValidation = uuidPathValidation;
