Page.class = class Dashboards extends Page {

	constructor() {

		super();

		this.list = new Map;

		this.listContainer = this.container.querySelector('section#list');

		this.listContainer.querySelector('#add-dashboard').on('click', () => {
			DashboardsDashboard.add();
			history.pushState({id: 'add'}, '', `/dashboards/add`);
		});

		DashboardsDashboard.setup(this);
		DashboardsShare.setup(this);

		(async () => {

			await this.load();

			this.loadState();
		})();

		window.on('popstate', e => this.loadState(e.state));
	}

	async loadState(state) {

		const what = state ? state.what : location.pathname.split('/').pop();

		if(what == 'add')
			return DashboardsDashboard.add();

		if(this.list.has(parseInt(what)))
			return this.list.get(parseInt(what)).edit();

		await Sections.show('list');
	}

	async back() {

		if(history.state)
			return history.back();

		await Sections.show('list');

		history.pushState(null, '', `/dashboards`);
	}

	async load() {

		this.response = await API.call('dashboards/list');

		await DataSource.load();

		this.process();
		this.render();
	}

	process() {

		this.list.clear();

		for(const dashboard of this.response || [])
			this.list.set(dashboard.id, new DashboardsDashboard(dashboard, this));
	}

	render() {

		const container = this.container.querySelector('table tbody');

		container.textContent = null;

		for(const dashboard of this.list.values())
			container.appendChild(dashboard.row);

		if(!this.list.size)
			container.innerHTML = `<tr class="NA"><td colspan="2">No dashboards found! :(</td></tr>`;
	}
}

class DashboardsDashboard {

	static setup(page) {

		DashboardsDashboard.page = page;

		DashboardsDashboard.container = page.container.querySelector('section#form');
		DashboardsDashboard.form = DashboardsDashboard.container.querySelector('form');

		DashboardsDashboard.container.querySelector('#back').on('click', page.back);

		DashboardsDashboard.editor = new Editor(DashboardsDashboard.container.querySelector('#dashboard-format'));

		DashboardsDashboard.editor.editor.getSession().setMode('ace/mode/json');
	}

	static async add() {

		DashboardsDashboard.container.querySelector('h1').textContent = 'Add New Dashboard';

		DashboardsDashboard.form.reset();

		if(DashboardsDashboard.form_listener)
			DashboardsDashboard.form.removeEventListener('submit', DashboardsDashboard.form_listener);

		DashboardsDashboard.form.on('submit', DashboardsDashboard.form_listener = e => DashboardsDashboard.insert(e));

		DashboardsDashboard.editor.value = '';

		await Sections.show('form');

		DashboardsDashboard.form.name.focus();
	}

	static async insert(e) {

		e.preventDefault();

		const options = {
			method: 'POST',
			form: new FormData(DashboardsDashboard.form),
		};

		const parameters = {
			format: DashboardsDashboard.editor.value,
		};

		const response = await API.call('dashboards/insert', parameters, options);

		await DashboardsDashboard.page.load();

		DashboardsDashboard.page.list.get(response.insertId).edit();

		history.pushState({what: response.insertId}, '', `/dashboards/${response.insertId}`);
	}

	constructor(data, page) {

		for(const key in data)
			this[key] = data[key];

		this.page = page;
		this.dashboardShare = new DashboardsShare(this);
	}

	async edit() {

		DashboardsDashboard.container.querySelector('h1').textContent = 'Edit ' + this.name;

		for(const element of DashboardsDashboard.form.elements) {
			if(this[element.name])
				element.value = this[element.name];
		}

		DashboardsDashboard.editor.value = JSON.stringify(this.format || {}, 0, 4) || '';

		if(DashboardsDashboard.form_listener)
			DashboardsDashboard.form.removeEventListener('submit', DashboardsDashboard.form_listener);

		DashboardsDashboard.form.on('submit', DashboardsDashboard.form_listener = async e => this.update(e));

		await Sections.show('form');

		DashboardsDashboard.form.name.focus();
	}

	async update(e) {

		e.preventDefault();

		try {
			JSON.parse(DashboardsDashboard.editor.value);
		} catch(e) {
			alert(e.message);
			return;
		}

		const parameters = {
			id: this.id,
			format: DashboardsDashboard.editor.value,
		};

		const options = {
			method: 'POST',
			form: new FormData(DashboardsDashboard.form),
		};

		await API.call('dashboards/update', parameters, options);

		await this.page.load();

		this.page.list.get(this.id).edit();
	}

	async delete() {

		if(!confirm('Are you sure?!'))
			return;

		const
			parameters = {
				id: this.id,
			},
			options = {
				method: 'POST',
			};

		await API.call('dashboards/delete', parameters, options);

		await this.page.load();
	}

	async share() {

		await this.dashboardShare.load();
		await Sections.show("share");
	}

	get row() {

		if(this.container)
			return this.container;

		this.container = document.createElement('tr');

		this.container.innerHTML = `
			<td>${this.id}</td>
			<td><a href="/dashboard/${this.id}" target="_blank">${this.name}</a></td>
			<td>${this.parent || ''}</td>
			<td>${this.icon || ''}</td>
			<td class="action green" title="Edit"><i class="far fa-edit"></i></td>
			<td class="action red" title="Delete"><i class="far fa-trash-alt"></i></td>
			<td class="action share" title="Share"><i class="fa fa-share-alt"></i></td>			
		`;

		this.container.querySelector('.share').on('click', () => {
			this.share();
		});

		this.container.querySelector('.green').on('click', () => {
			this.edit();
			history.pushState({what: this.id}, '', `/dashboards/${this.id}`);
		});

		this.container.querySelector('.red').on('click', async() => this.delete());

		return this.container;
	}
}

class DashboardsShare {

	constructor(page) {

		this.userDashboardList = new Map();

		for(const key in page)
			this[key] = page[key];

	}

	static setup(page) {

		DashboardsShare.container = page.container.querySelector('section#share');

		DashboardsShare.container.querySelector('#back').on('click', () => page.back());
		DashboardsShare.form = DashboardsShare.container.querySelector('#dashboard_share');

	}

	async load() {

		const
			parameters = {
				id : this.id,
			},
			options = {
				method : 'GET',
			};

		this.userDashboardResponse = await API.call('user/dashboards/list', parameters, options);
		this.userList = await API.call('users/list');

		if(DashboardsShare.form_listener)
			DashboardsDashboard.form.removeEventListener('submit', DashboardsDashboard.form_listener);

		DashboardsShare.form.on('submit', DashboardsShare.form_listener = e => this.add(e));

		this.process();
		this.render();
	}

	process() {

		this.userDashboardList.clear();

		for(const ud of this.userDashboardResponse)
			this.userDashboardList.set(ud.id, new UserDashboard(ud, this));

		const select_list = [`<option value=""></option>`];

		for(const user of this.userList) {

			select_list.push(`<option value="${user.user_id}">${user.first_name.concat(' ', user.last_name)}</option>`);
		}

		DashboardsShare.form.user_list.innerHTML = select_list.join("");

	}

	render() {

		const container = DashboardsShare.container.querySelector('table tbody');

		container.textContent = null;

		for(const [index, ud] of this.userDashboardList)
			container.appendChild(ud.row);

		if(!this.userDashboardList.size)
			container.insertAdjacentHTML('beforeend', `<tr class="NA"><td colspan="2">Not shared to any user! :(</td></tr>`);

	}

	async add(e) {

		e.preventDefault();

		const
			parameters = {
				dashboard_id : this.id,
				user_id : DashboardsShare.form.user_list.value
			},
			options = {
				method: 'POST',
			};

		await API.call('user/dashboards/insert', parameters, options);
		await this.load();

	}

}

class UserDashboard {

	constructor(data, page) {

		for(const key in data)
			this[key] = data[key];

		this.page = page;

	}

	get row() {

		if(this.container)
			return this.container;

		this.container = document.createElement('tr');

		this.container.innerHTML = `
			<td>${this.user_id}</td>
			<td>${this.first_name.concat(' ', this.last_name)}</a></td>
			<td class="action red" title="Delete"><i class="far fa-trash-alt"></i></td>
		`;

		this.container.querySelector('.red').on('click', async() => this.delete());

		return this.container;

	}

	async delete() {

		if(!confirm('Are you sure?!'))
			return;

		const
			parameters = {
				id : this.id,
			},
			options = {
				method : 'POST',
			};

		await API.call('user/dashboards/delete', parameters, options);
		await this.page.load();

	}

}