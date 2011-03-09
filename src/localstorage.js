function set_storage(storage) {
	for (var key in storage) {
		localStorage[key] = storage[key];
	}
}

function get_storage() {
	var options = new Object();
	for (var key in default_options) {
		options[key] = localStorage[key] || default_options[key];
	}
	return options;	
}
