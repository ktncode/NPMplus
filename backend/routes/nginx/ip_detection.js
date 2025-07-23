const express = require('express');
const jwtdecode = require('../../lib/express/jwt-decode');
const internalIpDetection = require('../../internal/ip-detection');
const internalUser = require('../../internal/user');

let router = express.Router({
	caseSensitive: true,
	strict: true,
	mergeParams: true,
});

/**
 * /api/nginx/ip-detection
 */
router
	.route('/')
	.options((req, res) => {
		res.sendStatus(204);
	})
	.all(jwtdecode())

	/**
	 * GET /api/nginx/ip-detection
	 *
	 * 利用可能なグローバルIPアドレスを取得
	 */
	.get((req, res, next) => {
		Promise.all([internalIpDetection.getAllAvailableIps(), internalUser.getUserPermissions(res.locals.access.token.get('user_id'))])
			.then(([availableIps, userPermissions]) => {
				// ユーザーの許可IPでフィルタリング
				const allowedIps = userPermissions.allowed_listen_ips || [];
				const filteredGlobalIps = internalIpDetection.filterAllowedIps(availableIps.global_ips, allowedIps);

				res.status(200).send({
					global_ips: filteredGlobalIps,
					allowed_ips: allowedIps,
					total_count: filteredGlobalIps.length,
				});
			})
			.catch(next);
	});

module.exports = router;
