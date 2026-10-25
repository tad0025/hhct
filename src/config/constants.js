require('dotenv').config();

function getRequiredEnv(key) {
  const val = process.env[key];
  if (typeof val !== 'string' || val.trim().length === 0) {
    throw new Error(`[CONFIG ERROR] Biến môi trường '${key}' bắt buộc phải được khai báo trong .env!`);
  }
  return val.trim();
}

const CONFIG = {
  PASSPORT_URL: getRequiredEnv('GAME_PASSPORT_URL'),
  CHECK_AUTH_URL: getRequiredEnv('GAME_CHECK_AUTH_URL'),
  GATEWAY_WS_URL: getRequiredEnv('GAME_GATEWAY_WS_URL'),
  ORIGIN_CDN: getRequiredEnv('GAME_ORIGIN_CDN'),
  GAME_ID: getRequiredEnv('GAME_ID'),
  SIMPLE_NAME: getRequiredEnv('GAME_SIMPLE_NAME'),
  SDK_SIMPLE_NAME: getRequiredEnv('GAME_SDK_SIMPLE_NAME'),
  SDK_VERSION_CODE: getRequiredEnv('GAME_SDK_VERSION_CODE'),
  CHANNEL: getRequiredEnv('GAME_CHANNEL'),
  CLIENT_VERSION: parseInt(getRequiredEnv('GAME_CLIENT_VERSION'), 10),
  APP_KEY: getRequiredEnv('GAME_APP_KEY'),

  PORT: parseInt(getRequiredEnv('PORT'), 10),

  NOTE_URL: getRequiredEnv('NOTE_URL'),
  NOTE_LOGIN_URL: getRequiredEnv('NOTE_LOGIN_URL'),
  NOTE_SAVE_URL: getRequiredEnv('NOTE_SAVE_URL'),
  NOTE_PASSWORD: getRequiredEnv('NOTE_PASSWORD'),
  NOTE_ID: getRequiredEnv('NOTE_ID'),
  NOTE_TITLE: getRequiredEnv('NOTE_TITLE')
};

module.exports = {
  CONFIG
};
