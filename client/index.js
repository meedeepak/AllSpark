"use strict";
const express = require('express')
const app = express();
const config = require('config');

const port = config.has('port') ? config.get('port').get('client') : 8081;

const checksum = require('child_process').execSync('git rev-parse --short HEAD').toString().trim();

app.use(express.static('./client'));

app.get('/login', (req, res) => {

	const template = new Template;

	template.stylesheets.push('css/login.css');
	template.scripts.push('js/login.js');

	res.send(template.body(`

		<div class="logo hidden">
			<img src="" />
		</div>

		<form class="form">

			<label>
				<span>Email</span>
				<input type="text" name="email" required>
			</label>

			<label>
				<span>Password</span>
				<input type="password" name="password" required>
			</label>

			<div>
				<a href="/login/forgot">Forgot password?</a>
				<button class="submit">
					<i class="fa fa-paper-plane"></i>
					Sign In
				</button>
			</div>
		</form>

		<div id="message" class="hidden"></div>
	`));
});

app.get('/login/forgot', (req, res) => {

	const template = new Template;

	template.stylesheets.push('/css/login.css');
	template.scripts.push('/js/forgotpassword.js');

	res.send(template.body(`

		<div class="logo hidden">
			<img src="" />
		</div>

		<form class="form">

			<label>
				<span>Email</span>
				<input type="email" name="email" required>
			</label>

			<div>
				<a href='/login'><i class="fa fa-arrow-left"></i> &nbsp;Login</a>
				<button class="submit">
					<i class="fa fa-paper-plane"></i>
					Send Link
				</button>
			</div>
		</form>

		<div id="message" class="hidden"></div>
	`));
});

app.get('/login/reset', (req,res) => {

	const template = new Template;

	template.stylesheets.push('/css/login.css');

	template.scripts.push('/js/resetpassword.js');

	res.send(template.body(`

		<div class="logo hidden">
			<img src="" />
		</div>

		<form class="form">

			<label>
				<span>New Password</span>
				<input type="password" name="password" required>
			</label>

			<div>
				<a href='/login'><i class="fa fa-arrow-left"></i> &nbsp;Login</a>
				<button class="submit">
					<i class="fa fa-paper-plane"></i>
					Change Password
				</button>
			</div>
		</form>

		<div id="message" class="hidden"></div>
	`));
});

app.get('/:type(dashboard|report)/:id?', (req, res) => {

	const template = new Template;

	template.stylesheets.push();

	template.stylesheets = template.stylesheets.concat([
		'/css/dashboard.css',

		'//cdn.jsdelivr.net/bootstrap/3/css/bootstrap.css',
		'//cdn.jsdelivr.net/bootstrap.daterangepicker/2/daterangepicker.css',
	]);

	template.scripts = template.scripts.concat([
		'/js/dashboard.js',

		'https://maps.googleapis.com/maps/api/js?key=AIzaSyA_9kKMQ_SDahk1mCM0934lTsItV0quysU" defer f="',
		'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/markerclusterer.js" defer f="',

		'//cdn.jsdelivr.net/jquery/1/jquery.min.js" defer f="',
		'//cdn.jsdelivr.net/momentjs/latest/moment.min.js" defer f="',
		'//cdn.jsdelivr.net/bootstrap.daterangepicker/2/daterangepicker.js" defer f="',

		'https://cdnjs.cloudflare.com/ajax/libs/d3/3.5.17/d3.min.js',
	]);

	res.send(template.body(`

		<nav>
			<div class="NA"><i class="fa fa-spinner fa-spin"></i></div>
		</nav>

		<section class="section" id="list">
			<h2>${req.params.type}</h2>

			<form class="form toolbar">

				<label class="right">
					<select name="category">
						<option value="">All Categories</option>
					</select>
				</label>

				<label>
					<input type="search" name="search" placeholder="Search...">
				</label>
			</form>

			<table class="block">
				<thead></thead>
				<tbody></tbody>
			</table>
		</section>

		<section class="section" id="reports">

			<div class="toolbar">

				<label>
					<button id="back">
						<i class="fa fa-arrow-left"></i>
						Back
					</button>
				</label>

				<label class="right">
					<input type="text" name="date-range">
				</label>
			</div>

			<div class="list"></div>
		</section>
	`));
});

app.get('/dashboards/:id?', (req, res) => {

	const template = new Template;

	template.stylesheets.push('/css/dashboards.css');

	template.scripts.push('/js/dashboards.js');
	template.scripts.push('https://cdnjs.cloudflare.com/ajax/libs/ace/1.2.9/ace.js');

	res.send(template.body(`

		<section class="section show" id="list">

			<h1>Dashboard Manager</h1>

			<form class="toolbar">
				<button type="button" id="add-dashboard">
					<i class="fa fa-plus"></i>
					Add New Dashboard
				</button>
			</form>

			<table class="block">
				<thead>
					<tr>
						<th class="thin">ID</th>
						<th>Name</th>
						<th>Parent</th>
						<th>Icon</th>
						<th class="action">Edit</th>
						<th class="action">Delete</th>
					</tr>
				</thead>

				<tbody></tbody>
			</table>
		</section>

		<section class="section" id="form">
			<h1></h1>

			<div class="toolbar">
				<button id="back"><i class="fa fa-arrow-left"></i> Back</button>
				<button type="submit" form="dashboard-form"><i class="fa fa-save"></i> Save</button>
			</div>

			<form class="block form" id="dashboard-form">

				<label>
					<span>Name</span>
					<input type="text" name="name" required>
				</label>

				<label>
					<span>Parent</span>
					<input type="number" name="parent">
				</label>

				<label>
					<span>Icon</span>
					<input type="text" name="icon">
				</label>

				<label id="format">
					<span>Format</span>
					<textarea id="dashboard-format"></textarea>
				</label>
			</form>
		</section>

	`));
});

app.get('/reports/:id?', (req, res) => {

	const template = new Template;

	template.stylesheets.push('/css/reports.css');

	template.scripts.push('/js/reports.js');
	template.scripts.push('https://cdnjs.cloudflare.com/ajax/libs/ace/1.2.9/ace.js');
	template.scripts.push('https://cdnjs.cloudflare.com/ajax/libs/ace/1.2.9/ext-language_tools.js');

	res.send(template.body(`

		<section class="section" id="list">

			<h1>Reports Manager</h1>
			<form class="toolbar filters filled">

				<button type="button" id="add-report">
					<i class="fa fa-plus"></i>
					Add New Report
				</button>

				<select name="column_search" class="right">
					<option value="">Search Everything</option>
					<option value="query_id">ID</option>
					<option value="name">Name</option>
					<option value="description">Description</option>
					<option value="source">Source</option>
					<option value="tags">Tags</option>
				</select>

				<input type="search" placeholder="Search&hellip;" name="search">
			</form>

			<div id="list-container">
				<table class="block">
					<thead>
						<tr>
							<th class="thin">ID</th>
							<th>Name</th>
							<th>Description</th>
							<th>Source</th>
							<th>Tags</th>
							<th>Filters</th>
							<th>Visualizations</th>
							<th>Enabled</th>
							<th class="action">Edit</th>
							<th class="action">Delete</th>
						</tr>
					</thead>
					<tbody></tbody>
				</table>
			</div>
		</section>

		<section class="section" id="form">

			<h1></h1>

			<header class="toolbar filled">
				<button id="back"><i class="fa fa-arrow-left"></i> Back</button>
				<button type="submit" form="report-form"><i class="fa fa-save"></i> Save</button>

				<button id="test" class="right"><i class="fas fa-sync"></i> Run</button>
				<button id="force-test"><i class="fas fa-sign-in-alt""></i> Force Run</button>
			</header>

			<div class="hidden" id="test-container">
				<h3>Execution Response
					<span id="row-count"></span>
					<span id="json" class="tab">JSON</span>
					<span id="table" class="tab">Table</span>
					<span id="query" class="tab">Query</span>
					<span title="Close" class="close">&times;</span>
				</h3>

				<div id="test-body">
					<div id="json-content"></div>
					<div id="table-content"></div>
					<div id="query-content"></div>
				</div>
			</div>

			<form class="form" id="report-form">

				<label>
					<span>Name</span>
					<input type="text" name="name">
				</label>

				<label>
					<span>Connection</span>
					<select name="connection_name" required></select>
				</label>

				<label id="source">
					<span>Type</span>
					<select name="source">
						<option value="query">Query</option>
						<option value="api">API</option>
					</select>
				</label>

				<label id="query" class="hidden">
					<span>Query</span>
					<div id="schema"></div>
					<div id="editor"></div>
				</label>

				<div id="api" class="hidden">

					<label>
						<span>URL</span>
						<input type="url" name="url">
					</label>

					<label>
						<span>Method</span>
						<select name="method">
							<option>GET</option>
							<option>POST</option>
						</select>
					</label>
				</div>

				<label>
					<span>Description</span>
					<textarea name="description" required></textarea>
				</label>

				<label>
					<span>Tags (Comma Separated)</span>
					<input type="text" name="tags">
				</label>

				<label>
					<span>Requested By</span>
					<input type="text" name="requested_by">
				</label>
				</label>

				<label>
					<span>Roles</span>
					<select required id="roles">
						<option value="5">Core</option>
						<option value="6">Core Ops</option>
						<option value="7">City Ops</option>
					</select>
				</label>

				<label>
					<span>Refresh Rate (Seconds)</span>
					<input type="number" name="refresh_rate" min="0" step="1">
				</label>

				<label>
					<span>Redis</span>
					<select name="is_redis" required>
						<option value="1">Enabled</option>
						<option value="0">Disabled</option>
					</select>
				</label>

				<label>
					<span>Status</span>
					<select name="is_enabled" required>
						<option value="1">Enabled</option>
						<option value="0">Disabled</option>
					</select>
				</label>

				<label style="max-width: 300px">
					<span>Added By</span>
					<span class="NA" id="added-by"></span>
				</label>
			</form>
			<h3>Filters</h3>

			<div id="missing-filters" class="hidden"></div>

			<div class="form-container">
				<form class="filter">
					<label><span>Name</span></label>
					<label><span>Placeholder</span></label>
					<label><span>Type</span></label>
					<label><span>Description</span></label>
					<label><span>Default Value</span></label>
					<label><span>Offset</span></label>
					<label><span>Dataset</span></label>
					<label><span>Status</span></label>
					<label class="save"><span></span></label>
					<label class="delete"><span></span></label>
				</form>

				<div id="filters-list"></div>

				<form id="add-filter" class="filter">

					<label>
						<input type="text" name="name" placeholder="Name" required>
					</label>

					<label>
						<input type="text" name="placeholder" placeholder="Placeholder" required>
					</label>

					<label>
						<select name="type" required>
							<option value="0">Integer</option>
							<option value="1">String</option>
							<option value="2">Date</option>
							<option value="3">Month</option>
							<option value="4">city</option>
						</select>
					</label>

					<label>
						<input type="text" name="description" placeholder="Description">
					</label>

					<label>
						<input type="text" name="default_value" placeholder="Default Value">
					</label>

					<label>
						<input type="text" name="offset" placeholder="Offset">
					</label>

					<label>
						<select name="dataset">
							<option value="">None</option>
						</select>
					</label>

					<label>
						<select name="is_enabled" required>
							<option value="1">Enabled</option>
							<option value="0">Disabled</option>
						</select>
					</label>

					<label class="save">
						<input type="submit" value="Add">
					</label>

					<label class="delete"></label>
				</form>
			</div>

			<h3>Visualizations</h3>
			<div class="form-container">
				<form class="visualization">
					<label><span>Name</span></label>
					<label><span>Type</span></label>
					<label><span>Status</span></label>
					<label class="save"><span></span></label>
					<label class="delete"><span></span></label>
				</form>

				<div id="visualizations-list"></div>

				<form id="add-visualization" class="visualization">

					<label>
						<input type="text" name="name" placeholder="Name" required>
					</label>

					<label>
						<select name="type" required>
							<option value="table">Table</option>
							<option value="spatialmap">Spatial Maps</option>
							<option value="funnel">Funnel</option>
							<option value="cohort">Cohort</option>
							<option value="line">Line</option>
							<option value="bar">Bar</option>
							<option value="area">Area</option>
							<option value="stacked">Stacked</option>
						</select>
					</label>

					<label>
						<select name="is_enabled" required>
							<option value="1">Enabled</option>
							<option value="0">Disabled</option>
						</select>
					</label>

					<label class="save">
						<input type="submit" value="Add">
					</label>

					<label class="delete"></label>
				</form>
			</div>
		</section>
	`));
});

app.get('/users/:id?', (req, res) => {

	const template = new Template;

	template.stylesheets.push('/css/users.css');
	template.scripts.push('/js/users.js');

	res.send(template.body(`

		<section class="section" id="list">

			<h1>Manage Users</h1>

			<header class="toolbar">
				<button id="add-user"><i class="fa fa-plus"></i> Add New User</button>
			</header>

			<table class="block">
				<thead>
					<tr>
						<th>ID</th>
						<th>Name</th>
						<th>Email</th>
						<th class="action">Edit</th>
						<th class="action">Delete</th>
					</tr>
				</thead>
				<tbody></tbody>
			</table>
		</section>

		<section class="section" id="form">

			<h1></h1>

			<header class="toolbar">
				<button id="cancel-form"><i class="fa fa-arrow-left"></i> Back</button>
				<button type="submit" form="user-form"><i class="fa fa-save"></i> Save</button>
			</header>

			<form class="block form" id="user-form">

				<label>
					<span>Fist Name</span>
					<input type="text" name="first_name" required>
				</label>

				<label>
					<span>Middle Name</span>
					<input type="text" name="middle_name">
				</label>

				<label>
					<span>Last Name</span>
					<input type="text" name="last_name">
				</label>

				<label>
					<span>Email</span>
					<input type="email" name="email" required>
				</label>

				<label>
					<span>Password</span>
					<input type="password" name="password">
				</label>
			</form>

			<h3>Privileges</h3>
			<div class="privileges form-container">
				<form class="filter">
					<label><span>Category</span></label>
					<label><span>Privileges</span></label>
					<label class="edit"><span></span></label>
					<label class="save"><span></span></label>
				</form>

				<div id="filters-list"></div>

				<form id="add-filter" class="filter">

					<label>
						<select name="category_id"></select>
					</label>

					<label>
						<select name="privilege_id"></select>
					</label>

					<label class="save">
						<button type="submit" title="Add"><i class="fa fa-paper-plane"></i></button>
					</label>
				</form>
			</div>

			<h3>Roles</h3>
			<div class="roles form-container">
				<form class="filter">
					<label><span>Category</span></label>
					<label><span>Roles</span></label>
					<label class="edit"><span></span></label>
					<label class="save"><span></span></label>
				</form>

				<div id="roles-list"></div>

				<form id="add-roles" class="filter">

					<label>
						<select name="category_id" required></select>
					</label>

					<label>
						<select name="role_id" required></select>
					</label>

					<label class="save">
						<button type="submit" title="Add"><i class="fa fa-paper-plane"></i></button>
					</label>
				</form>
			</div>


		</section>
	`));
});

app.get('/connections/:id?', (req, res) => {

	const template = new Template;

	template.stylesheets.push('/css/connections.css');
	template.scripts.push('/js/connections.js');

	res.send(template.body(`
		<section class="section" id="list">

			<h1>Connection Manager</h1>

			<form class="toolbar filters">
				<button type="button" id="add-connection">
					<i class="fa fa-plus"></i>
					Add New Connection
				</button>
			</form>

			<div class="block overflow">
				<table>
					<thead>
						<tr>
							<th class="thin">ID</th>
							<th>Name</th>
							<th>Type</th>
							<th class="action">Edit</th>
							<th class="action">Delete</th>
						</tr>
					</thead>
					<tbody></tbody>
				</table>
			</div>

		</section>

		<section class="section" id="form">

			<h1></h1>

			<header class="toolbar">
				<button id="back"><i class="fa fa-arrow-left"></i> Back</button>
				<button type="submit" form="connections-form"><i class="fa fa-save"></i> Save</button>
			</header>

			<form class="block form" id="connections-form">

				<label>
					<span>Name</span>
					<input type="text" name="connection_name">
				</label>

				<label id="connections">
					<span>Type</span>
					<select name="type"></select>
				</label>

				<div id="details"></div>
			</form>
		</section>
	`));
});

app.get('/settings/:tab?/:id?', (req, res) => {

	const template = new Template;

	template.stylesheets.push('/css/settings.css');
	template.scripts.push('/js/settings.js');

	res.send(template.body(`
		<nav>
			<a>Accounts</a>
			<a>Privileges</a>
			<a>Roles</a>
			<a>DataSets</a>
		</nav>
	`));
});

class Template {

	constructor() {

		this.stylesheets = [
			'/css/main.css',
		];

		this.scripts = [
			'/js/main.js',
			'https://use.fontawesome.com/releases/v5.0.8/js/all.js" async defer f="',
		];
	}

	body(main) {

		return `<!DOCTYPE html>
			<html>
				<head>
					<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
					<title>Tookan Analytics</title>
					<link id="favicon" rel="shortcut icon" type="image/png" href="https://lbxoezeogn43sov13789n8p9-wpengine.netdna-ssl.com/img/favicon.png" />

					${this.stylesheets.map(s => '<link rel="stylesheet" type="text/css" href="'+s+'?'+checksum+'">').join('')}
					${this.scripts.map(s => '<script src="'+s+'?'+checksum+'"></script>').join('')}
					<script>
						PORT = ${JSON.stringify(config.get('port'))}
					</script>
				</head>
				<body>
					<div id="ajax-working"></div>
					<header>
						<a class="logo" href="/"><img></a>

						<nav></nav>

						<span class="user-name"></span>
						<span class="logout">
							<i class="fa fa-power-off"></i>
						</span>
					</header>
					<main>
						${main || ''}
					</main>
				</body>
			</html>
		`;
	}
}

if(!port)
	return console.error('Port not provided!');

app.listen(port, () => console.info(`
	**********************
	Server Started:
		What: Client
		Environment: ${app.get('env')}
		Port: ${port}
	**********************
`));