#!/usr/bin/env node
require('babel-register');

const ExcelToSql = require('./ExcelToSql').default;

module.exports = {
  ExcelToSql
};
