var Attribute = function(name, value, node, data) {
	this.name = name;
	this.value = value;
	this.node = node;
	this.interpolationName = new Interpolation(this.name, null, this);
	this.interpolationValue = new Interpolation(this.value, null, this);
	this.invalidate = false;
};
Attribute.prototype = {
	toString: function() {
		return '[object Attribute]';
	},
	dispose: function() {
		if (this.interpolationName) this.interpolationName.dispose();
		if (this.interpolationValue) this.interpolationValue.dispose();
		this.interpolationName = null;
		this.interpolationValue = null;
		this.node = null;
		this.name = null;
		this.value = null;
		this.previousName = null;
	},
	update: function() {
		this.interpolationName.update();
		this.interpolationValue.update();
	},
	render: function() {
		if (this.node.repeater) return;
		var element = this.node.element;
		if (this.invalidate) {
			this.invalidate = false;
			this.previousName = this.name;
			this.name = this.interpolationName.render() || this.name;
			this.value = this.interpolationValue.render() || this.value;
			if (this.name === attributes.src) {
				renderSrc(this.name, this.value);
			}
			else if (this.name === attributes.href) {
				renderHref(this.name, this.value);
			}
			else {
				this.node.element.removeAttribute(this.interpolationName.value);
				if (this.previousName) {
					if (this.node.element.canHaveChildren && this.previousName === 'class') {
						// iE
						this.node.element.className = "";
					}
					else {
						this.node.element.removeAttribute(this.previousName);
					}
				}
				renderAttribute(this.name, this.value, this.previousName);
			}
		}
		// cloak
		if (this.name === 'class' && this.value.indexOf(settings.attributes.cloak) !== -1) {
			removeClass(this.node.element, settings.attributes.cloak);
		}
		// hide
		if (this.name === attributes.hide) {
			element.style.display = isAttributeDefined(this.value) ? "none" : "block";
		}
		// show
		if (this.name === attributes.show) {
			element.style.display = isAttributeDefined(this.value) ? "block" : "none";
		}
		// checked
		if (this.name === attributes.checked) {
			if (element.canHaveChildren !== undefined) {
				// IE
				element.checked = isAttributeDefined(this.value) ? true : false;
			}
			else {
				renderSpecialAttribute(this.name, this.value, 'checked');
			}
		}
		// disabled
		if (this.name === attributes.disabled) {
			renderSpecialAttribute(this.name, this.value, 'disabled');
		}
		// multiple
		if (this.name === attributes.multiple) {
			renderSpecialAttribute(this.name, this.value, 'multiple');
		}
		// readonly
		if (this.name === attributes.readonly) {
			if (element.canHaveChildren !== undefined) {
				// IE
				element.readOnly = isAttributeDefined(this.value) ? true : false;
			}
			else {
				renderSpecialAttribute(this.name, this.value, 'readonly');
			}
		}
		// selected
		if (this.name === attributes.selected) {
			renderSpecialAttribute(this.name, this.value, 'selected');
		}
		// normal attribute
		function renderAttribute(name, value) {
			if (element.canHaveChildren && name === "class") {
				// IE
				element.className = value;
			}
			else {
				element.setAttribute(name, value);
			}
		}
		// special attribute
		function renderSpecialAttribute(name, value, attrName) {
			if (isAttributeDefined(value)) {
				element.setAttribute(attrName, attrName);
			}
			else {
				element.removeAttribute(attrName);
			}
		}
		// src attribute
		function renderSrc(name, value) {
			element.setAttribute('src', value);
		}
		// href attribute
		function renderHref(name, value) {
			element.setAttribute('href', value);
		}
	}
};
