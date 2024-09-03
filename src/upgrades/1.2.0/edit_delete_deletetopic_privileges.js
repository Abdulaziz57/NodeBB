/* eslint-disable no-await-in-loop */
'use strict';

const winston = require('winston');
const db = require('../../database');
const groupsAPI = require('../../groups');
const privilegesAPI = require('../../privileges');

module.exports = {
	name: 'Granting edit/delete/delete topic on existing categories',
	timestamp: Date.UTC(2016, 7, 7),

	method: async function () {
		const cids = await db.getSortedSetRange('categories:cid', 0, -1);

		for (const cid of cids) {
			const data = await privilegesAPI.categories.list(cid);
			const { groups, users } = data;

			await handlePrivileges(groups, cid, true);
			await handlePrivileges(users, cid, false);

			winston.verbose(`-- cid ${cid} upgraded`);
		}
	},
};

async function handlePrivileges(entities, cid, isGroup) {
	for (const entity of entities) {
		if (entity.privileges['topics:reply'] || entity.privileges['groups:topics:reply']) {
			await Promise.all([
				groupsAPI.join(`cid:${cid}:privileges:${isGroup ? 'groups:' : ''}posts:edit`, isGroup ? entity.name : entity.uid),
				groupsAPI.join(`cid:${cid}:privileges:${isGroup ? 'groups:' : ''}posts:delete`, isGroup ? entity.name : entity.uid),
			]);
			winston.verbose(`cid:${cid}:privileges:${isGroup ? 'groups:' : ''}posts:edit, cid:${cid}:privileges:${isGroup ? 'groups:' : ''}posts:delete granted to ${isGroup ? 'gid' : 'uid'}: ${isGroup ? entity.name : entity.uid}`);
		}

		if (entity.privileges['topics:create'] || entity.privileges['groups:topics:create']) {
			await groupsAPI.join(`cid:${cid}:privileges:${isGroup ? 'groups:' : ''}topics:delete`, isGroup ? entity.name : entity.uid);
			winston.verbose(`cid:${cid}:privileges:${isGroup ? 'groups:' : ''}topics:delete granted to ${isGroup ? 'gid' : 'uid'}: ${isGroup ? entity.name : entity.uid}`);
		}
	}
}
