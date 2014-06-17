(function() {
	var rootPath = 'https://jira.yandex-team.ru/rest',
		apiPath = rootPath + '/api/latest',
		gadgetPath = rootPath + '/gadget/latest',
		webPath = 'https://jira.yandex-team.ru/browse/',
		issueKey = document.location.pathname.match(/browse\/(.+)/)[1];

	if(!issueKey) return;

	function microAjax(url, callback) {
		var req = (function() {
				if (window.ActiveXObject)
					return new ActiveXObject('Microsoft.XMLHTTP');
				else if (window.XMLHttpRequest)
					return new XMLHttpRequest();
				return false;
			}()),
			postBody = (arguments[2] || "");
		
		req.onreadystatechange = function (object) {
			if (req.readyState == 4) {
				callback(req.responseText);
			}
		};

		if (postBody !== '') {
			req.open("POST", url, true);
			req.setRequestHeader('Content-Type', 'application/json');
		} else {
			req.open("GET", url, true);
		}

		req.send(postBody);
	}

	var newIssueParams = {
		fields: {}
	};

	microAjax(gadgetPath + '/currentUser', function(response) {
		var user = JSON.parse(response);

		newIssueParams.fields.assignee = newIssueParams.fields.reporter = { name : user.username };

		microAjax(apiPath + '/issue/' + issueKey + '?fields=summary,components,labels', function(response) {
			var originalIssueData = JSON.parse(response);

			newIssueParams.fields.summary = issueKey + ':' + originalIssueData.fields.summary;
			
			// newIssueParams.fields.components = (originalIssueData.fields.components || []).map(function(component) { return { id: component.id }});
			newIssueParams.fields.labels = originalIssueData.fields.labels;

			microAjax(apiPath + '/issue/createmeta?projectKeys=DIRECT&issuetypeNames=Bug', function(response) {
				var createMeta = JSON.parse(response);

				newIssueParams.fields.project = { id: createMeta.projects[0].id };
				newIssueParams.fields.issuetype = { id: createMeta.projects[0].issuetypes[0].id };

				microAjax(apiPath + '/project/DIRECT/components', function(response) {
					var components = JSON.parse(response),
						componentId;

					components.some(function(component) {
						if(/Поддержка/.test(component.name)) {
							componentId = component.id;
							return true;
						}

						return false;
					})

					if(!componentId) return;

					newIssueParams.fields.components = [{ id: componentId }];

					microAjax(apiPath + '/issue', function(response) {
						var newIssueData = JSON.parse(response),
							linkData = {
								type: { name: 'Relation' },
							    inwardIssue: { key: newIssueData.key },
							    outwardIssue: { key: originalIssueData.key }
							};

						microAjax(apiPath + '/issueLink', function() {
							linkData.inwardIssue.key = originalIssueData.key;
							linkData.outwardIssue.key = newIssueData.key;

							microAjax(apiPath + '/issueLink', function() {
								document.location = webPath + newIssueData.key;		
							}, JSON.stringify(linkData));
						}, JSON.stringify(linkData));
					}, JSON.stringify(newIssueParams));
				});
			});	
		});
	});
}())