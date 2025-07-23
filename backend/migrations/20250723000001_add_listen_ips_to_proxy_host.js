const migrate_name = 'add-listen-ips-to-proxy-host';
const logger = require('../logger').migrate;

/**
 * Migrate
 *
 * @see http://knexjs.org/#Schema
 *
 * @param   {Object}  knex
 * @param   {Promise} Promise
 * @returns {Promise}
 */
exports.up = function (knex /*, Promise */) {
	logger.info('[' + migrate_name + '] Migrating Up...');

	return knex.schema
		.table('proxy_host', (table) => {
			table.json('listen_ips').nullable();
		})
		.then(() => {
			logger.info('[' + migrate_name + '] proxy_host.listen_ips column added');
		})
		.then(() => {
			return knex.schema.table('user_permission', (table) => {
				table.json('allowed_listen_ips').nullable();
			});
		})
		.then(() => {
			logger.info('[' + migrate_name + '] user_permission.allowed_listen_ips column added');
		});
};

/**
 * Undo Migrate
 *
 * @param   {Object}  knex
 * @param   {Promise} Promise
 * @returns {Promise}
 */
exports.down = function (knex /*, Promise */) {
	logger.info('[' + migrate_name + '] Migrating Down...');

	return knex.schema
		.table('proxy_host', (table) => {
			table.dropColumn('listen_ips');
		})
		.then(() => {
			return knex.schema.table('user_permission', (table) => {
				table.dropColumn('allowed_listen_ips');
			});
		});
};
