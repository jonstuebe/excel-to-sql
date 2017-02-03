/* eslint-disable filenames/match-regex */
import XLSX from 'xlsx';
import fs from 'fs';
import _ from 'lodash';
import Promise from 'bluebird';
import moment from 'moment';

export default class ExcelToSql {

  constructor(options) {
    this.options = _.merge({
      dbClient: 'postgresql',
      dbDebug: false,
      defaultSheet: 'data',
      columns: [],
    }, options);
    /* eslint-disable */
    this.knex = require('knex')({
      client: this.options.dbClient
    });
    /* eslint-enable */
    this.query = [];
  }

  /* eslint-disable class-methods-use-this */
  renderDate(value) {
    return moment(value, 'MM/DD/YY').format('YYYY-MM-DD HH:mm:ss+00').toString();
  }
  /* eslint-enable */

  toSQL(data) {
    return _.compact(_.map(data, (row, index) => {
      if (index > 0) {
        return this.knex(this.options.tableName).insert(row).toString();
      }
      return null;
    }));
  }

  getData() {
    return new Promise((resolve) => {
      const data = XLSX.utils.sheet_to_json(this.sheet);
      this.data = data;
      resolve(data);
    });
  }

  transformData(data) {
    return _.map(data, (oldRow) => {
      /* eslint-disable prefer-const */
      let row = oldRow;
      let dateFormat = 'YYYY-MM-DD HH:mm:ss+00';
      /* eslint-enable */
      _.each(row, (cell, name) => {
        if (cell.match(/^[0-9]{1,2}\/[0-9]{1,2}\/[0-9]{2}/)) {
          row[name] = moment(cell, 'M/DD/YYYY').format(dateFormat).toString();
        }
        if (this.options.columns.length > 0 && !_.includes(this.options.columns, name)) {
          delete row[name];
        }
      });

      return row;
    });
  }

  from(path) {
    const workbook = XLSX.readFile(path);
    this.workbook = workbook;
    this.sheet = workbook.Sheets[this.options.defaultSheet];
    return this;
  }

  to(path, type = 'sql', file = true) {
    return this
    .getData()
    .then(data => this.transformData(data))
    .then((data) => {
      if (type === 'sql') {
        return this.toSQL(data);
      }
      return data;
    })
    .then(data => `BEGIN;\n\n${data.join(';\n')};\n\nCOMMIT;`)
    .then((data) => {
      if (file === true) {
        fs.writeFileSync(path, data, 'utf-8');
        return this;
      }
      return data;
    });
  }
}
