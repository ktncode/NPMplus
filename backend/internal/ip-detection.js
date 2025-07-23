const os = require('os');

const internalIpDetection = {
	/**
	 * システムで利用可能なネットワークインターフェースから
	 * グローバルIPアドレス（外部アクセス可能なIP）を検出
	 * @returns {Promise<Array>} グローバルIPアドレスの配列
	 */
	getGlobalIps: async () => {
		const networkInterfaces = os.networkInterfaces();
		const globalIps = [];

		for (const [interfaceName, addresses] of Object.entries(networkInterfaces)) {
			if (!addresses) continue;

			for (const addr of addresses) {
				// ループバック、内部、リンクローカルアドレスをスキップ
				if (addr.internal || addr.address.startsWith('127.') || addr.address.startsWith('169.254.') || addr.address.startsWith('::1') || addr.address.startsWith('fe80::')) {
					continue;
				}

				// プライベートIPアドレスをスキップ
				if (internalIpDetection.isPrivateIp(addr.address)) {
					continue;
				}

				globalIps.push({
					interface: interfaceName,
					address: addr.address,
					family: addr.family,
					type: 'global',
				});
			}
		}

		return globalIps;
	},

	/**
	 * プライベートIPアドレスかどうかを判定
	 * @param {string} ip IPアドレス
	 * @returns {boolean} プライベートIPの場合true
	 */
	isPrivateIp: (ip) => {
		// IPv6 プライベートアドレス
		if (ip.includes(':')) {
			return (
				ip.startsWith('fc') || // Unique Local Address fc00::/7
				ip.startsWith('fd') || // Unique Local Address fd00::/8
				ip.startsWith('fe80:') || // Link-local fe80::/10
				ip.startsWith('::1') || // Loopback
				ip.startsWith('::') || // Unspecified address
				ip.startsWith('2001:db8:') // Documentation range
			);
		}

		// IPv4 プライベートアドレス範囲
		const privateRanges = [
			/^10\./, // 10.0.0.0/8
			/^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
			/^192\.168\./, // 192.168.0.0/16
		];

		return privateRanges.some((range) => range.test(ip));
	},

	/**
	 * すべての利用可能IPアドレスを取得
	 * @returns {Promise<Object>} IPアドレス情報
	 */
	getAllAvailableIps: async () => {
		try {
			const globalIps = await internalIpDetection.getGlobalIps();

			return {
				global_ips: globalIps,
				total_count: globalIps.length,
			};
		} catch (err) {
			throw new Error(`Failed to detect IP addresses: ${err.message}`);
		}
	},

	/**
	 * ユーザーが許可されたIPアドレスのみをフィルタリング
	 * @param {Array} availableIps 利用可能なIPアドレス
	 * @param {Array} allowedIps ユーザーに許可されたIP
	 * @returns {Array} フィルタリングされたIPアドレス
	 */
	filterAllowedIps: (availableIps, allowedIps) => {
		if (!allowedIps || allowedIps.length === 0) {
			return availableIps; // 制限なしの場合はすべて許可
		}

		// availableIps が { address: "x.x.x.x", interface: "eth0" } 形式の場合
		if (availableIps.length > 0 && typeof availableIps[0] === 'object') {
			return availableIps.filter(
				(ip) => allowedIps.includes(ip.address) || allowedIps.includes('*'), // ワイルドカード許可
			);
		} else {
			// availableIps が単純な文字列配列の場合
			return availableIps.filter(
				(ip) => allowedIps.includes(ip) || allowedIps.includes('*'), // ワイルドカード許可
			);
		}
	},
};

module.exports = internalIpDetection;
