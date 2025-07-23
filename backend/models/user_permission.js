// Objection Docs:
// http://vincit.github.io/objection.js/

const db = require('../db');
const Model = require('objection').Model;
const now = require('./now_helper');

Model.knex(db);

class UserPermission extends Model {
	$beforeInsert() {
		this.created_on = now();
		this.modified_on = now();

		// Default for allowed_listen_ips
		if (typeof this.allowed_listen_ips === 'undefined') {
			this.allowed_listen_ips = [];
		}
	}

	$beforeUpdate() {
		this.modified_on = now();
	}

	static get name() {
		return 'UserPermission';
	}

	static get tableName() {
		return 'user_permission';
	}

	static get jsonAttributes() {
		return ['allowed_listen_ips'];
	}
}

module.exports = UserPermission;
