/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/


import * as vscode from 'vscode';
import * as git from './api/git';

function getJiraID(branch_name: string | undefined) {
	console.log("getJiraID", branch_name);
	if (branch_name === undefined) { return null; }
	// 将branch_name中的JIRA-ID返回出来，如果没有的话就返回
	// 按照正则表达式，release/FRCS-123-XXXXXX
	const r_exp: RegExp = RegExp("^[A-Za-z]+/([A-Za-z]+-[0-9]+)");
	let result = branch_name.match(r_exp);
	if (result === null) {
		return null;
	}

	return result[1];
}

function checkWorkTime(work_time: string | undefined) {
	console.log("checkWorkTime", work_time);
	if (work_time === undefined) { return false; }

	const r_exp: RegExp = RegExp("^[0-9dhm]+$");
	let result = work_time.match(r_exp);
	if (result === null) {
		return false;
	}
	return true;
}

export async function activate(context: vscode.ExtensionContext) {
	function getGitExtension() {
		return vscode.extensions.getExtension<git.GitExtension>('vscode.git')?.activate();
	}

	const gitExtension = await getGitExtension();
	if (!gitExtension?.enabled) {
		vscode.window.showErrorMessage(
			'Git extensions are not currently enabled, please try again after enabled!',
		);
		return false;
	}
	const git_api = gitExtension.getAPI(1);

	// 设置一系列回调，在回调里判断当前分支
	let disposable = vscode.commands.registerCommand(
		'extension.showJiraGitCommit',
		async (uri?) => {
			if (git_api.repositories.length === 0) {
				vscode.window.showErrorMessage("repository is empty!");
				return false;
			}
			let repo: git.Repository | undefined = git_api.repositories[0];
			if (uri) {
				//如果有多个repo 寻找当前的 进行填充 If there are multiple repos looking for the current to populate
				repo = gitExtension.getAPI(1).repositories.find(repo => {
					const uriRoot = uri._rootUri ? uri._rootUri : uri.rootUri;
					return repo.rootUri.path === uriRoot?.path;
				});
			}
			if (repo === undefined) {
				vscode.window.showErrorMessage("Invalid repo");
				return false;
			}
			console.log("repos: ", git_api.repositories);
			let head = repo.state.HEAD;
			if (head === undefined) {
				vscode.window.showErrorMessage("repo do not have HEAD");
				return false;
			}
			let current_branch = head.name;
			if (current_branch === undefined) {
				vscode.window.showErrorMessage("repo HEAD do not have name");
				return false;
			}
			console.log("current branch ", current_branch);
			let jira_id: any = getJiraID(current_branch);
			console.log("jira_id:", jira_id);

			// 提示输入工作时长
			let work_time = await vscode.window.showInputBox({ ignoreFocusOut: true, title: "工作时长:", value: "1d", prompt: "天d 小时h 分钟m   示例: 1d3h25m" });
			console.log("input work time:", work_time);

			if (work_time === undefined) {
				vscode.window.showInformationMessage("cancel input work time");
				return false;
			}

			if (checkWorkTime(work_time) === false) {
				console.log("invalid work time", work_time);
				vscode.window.showErrorMessage("Invalid work time! [" + work_time + "]");
				return false;
			}

			// 将字符串导入到commit框中
			repo.inputBox.value = jira_id + " #time " + work_time + " ";
		},
	);
	context.subscriptions.push(disposable);
}

export function deactivate() { }