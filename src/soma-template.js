;(function (soma, undefined) {

	'use strict';

	soma.template = soma.source || {};
	soma.template.version = "0.0.1";

	var errors = soma.template.errors = {
		COMPILE_NO_ELEMENT: "Error in soma.Template.compile(), no target specified: template.source(element).compile(data).",
		REPEAT_WRONG_ARGUMENTS: "Error in template, repeat attribute requires this syntax: 'item in items'."
	};

	var settings = soma.template.settings = soma.template.settings || {};
	var tokens = settings.tokens = {
		start:"{{",
		end:"}}"
	};
	var regex = settings.regex = {
		attrs: new RegExp("([-A-Za-z0-9" + tokens.start + tokens.end + "(())._]+)(?:\s*=\s*(?:(?:\"((?:\\.|[^\"])*)\")|(?:'((?:\\.|[^'])*)')|([^>\u0020|\u0009]+)))?", "g"),
		pattern:new RegExp(tokens.start + "(.*?)" + tokens.end, "gm"),
		path:new RegExp(tokens.start + "|" + tokens.end, "gm"),
		node: /<(.|\n)*?>/gi,
		repeat:/(.*)\s+in\s+(.*)/,
		findFunction:/(.*)\((.*)\)/,
		findParams:/,\s+|,|\s+,\s+/,
		findString:/('|")(.*)('|")/,
		findDoubleQuote:/\"/g,
		findSingleQuote:/\'/g
	};

	var attributes = settings.attrs = {
		skip:"data-skip"
	};
	var vars = settings.vars = {
		index:"index"
	};

	var isArray = function(value) {
		return Object.prototype.toString.apply(value) === '[object Array]';
	};

	var isObject = function(value) {
		return typeof value === 'object';
	}

	var isElement = function(value) {
		return value ? value.nodeType > 0 : false;
	};

	var getValue = function(obj, val) {
//		var t = new Date().getTime();
		var fnParts = val.match(regex.findFunction);
		var parts;
		if (fnParts) {
			// has path in
			parts = fnParts[1].split('.');
			parts[1] += '(' + fnParts[2] + ')'
		}
		else {
			parts = val.split('.');
		}
		var val = obj;
		var i = -1;
		var il = parts.length;
		while (++i < il) {
			var fp = parts[i].match(regex.findFunction);
			if (fp) {
				var f = fp[1];
				var p = fp[2];
				var params = [];
				if (typeof val[f] !== 'function') return undefined;
				if (p && p !== "") {
					if (p.match(regex.findString)) {
						// string
						p = p.replace(regex.findDoubleQuote, "");
						p = p.replace(regex.findSingleQuote, "");
						params = p.split(regex.findParams);
					}
					else {
						// value
						var pp = p.split(regex.findParams);
						for (var k=0; k<pp.length; k++) {
							params.push(getValue(obj, pp[k]));
						}
					}
				}
				var fnVal = val[f].apply(null, params);
				if (!fnVal) return undefined;
				return fnVal;
			}
			else {
				if (!val[parts[i]]) return undefined;
				val = val[parts[i]];
			}
		}
//		console.log(">> VALUE", new Date().getTime() - t, val);
		return val;
	};

	var replaceIndex = function(index, path, value, match) {
		var val = value;
		if (path === vars.index && index !== undefined) {
			return val.replace(match, index);
		}
		return val;
	};

	var replaceMatches = function(value, obj, index) {
		var str = value;
		var matches = str.match(regex.pattern);
		if (matches) {
			var i = -1;
			var il = matches.length;
			while (++i < il) {
				var path = matches[i].replace(regex.path, "");
				var val = getValue(obj, path);
				if (val) str = str.replace(matches[i], val);
				str = replaceIndex(index, path, str, matches[i]);
			}
		}
		return str;
	};

	var replaceNodeValue = function(el, obj, index) {
		if (el.nodeValue) {
			el.nodeValue = replaceMatches(el.nodeValue, obj, index);
		}
	};

	var applyTemplate = function (el, obj, index) {
		var matches, path, val, isRepeater = false;
		// comment
		if (el.nodeType === 8) return;
		// skip
		if (el.getAttribute && el.getAttribute(attributes.skip) !== null) return;
		// node value
		replaceNodeValue(el, obj, index);
		// comment
		if (el.nodeType === 3) return;
		// attributes
		var node = el.outerHTML.match(regex.node)[0];
		var attrs = node.match(regex.attrs);
		attrs.shift();
		if (attrs.length > 0) {
			for (var i=0; i<attrs.length; i++) {
				var nParts = attrs[i].split('=');
				var nn = nParts[0];
				var nv = nParts[1];
				if (nv) {
					nv = nv.replace(regex.findDoubleQuote, "");
					nv = nv.replace(regex.findSingleQuote, "");
				}
				if (nn === "data-repeat") {
					// repeat attribute
					matches = nv.match(regex.repeat);
					if (!matches || matches.length !== 3) {
						throw new Error(errors.REPEAT_WRONG_ARGUMENTS);
					}
					else {
						var itVar = matches[1];
						var itPath = matches[2];
						var itSource = getValue(obj, itPath);
						if (isArray(itSource)) {
							isRepeater = true;
							el.removeAttribute('data-repeat');
							var fragment1 = document.createDocumentFragment();
							var o1 = {};
							var newNode;
							var k = -1;
							var kl = itSource.length;
							while (++k < kl) {
								o1[itVar] = itSource[k];
								newNode = el.cloneNode(true);
								fragment1.appendChild(newNode);
								applyTemplate(newNode, o1, k);
							}
							el.parentNode.appendChild(fragment1);
							el.parentNode.removeChild(el);
						}
						else if (isObject(itSource)) {
							isRepeater = true;
							el.removeAttribute('data-repeat');
							var fragment2 = document.createDocumentFragment();
							var o2 = {};
							var newNode;
							for (var o in itSource) {
								o2[itVar] = itSource;
								newNode = el.cloneNode(true);
								fragment2.appendChild(newNode);
								applyTemplate(newNode, o2);
							}
							el.parentNode.appendChild(fragment2);
							el.parentNode.removeChild(el);
						}
					}
				}
				else if (nn === "data-src") {
					// src attribute
					matches = nv.match(regex.pattern);
					if (matches) {
						var j = -1;
						var jl = matches.length;
						while (++j < jl) {
							var path = matches[j].replace(regex.path, "");
							var val = getValue(obj, path);
							if (val) nv = nv.replace(matches[j], val);
							if (path === "index" && index !== undefined) {
								nv = nv.replace(matches[j], index);
							}
						}
						el.setAttribute("src", nv);
						el.removeAttribute("data-src");
					}
				}
				else if (nn === "data-href") {
					// src attribute
					matches = nv.match(regex.pattern);
					if (matches) {
						var r = -1;
						var rl = matches.length;
						while (++r < rl) {
							var path = matches[r].replace(regex.path, "");
							var val = getValue(obj, path);
							if (val) nv = nv.replace(matches[r], val);
							if (path === "index" && index !== undefined) {
								nv = nv.replace(matches[r], index);
							}
						}
						el.setAttribute("href", nv);
						el.removeAttribute("data-href");
					}
				}
				else if (nn === "data-show") {
					// src attribute
					matches = nv.match(regex.pattern);
					if (matches) {
						var s = -1;
						var sl = matches.length;
						while (++s < sl) {
							var path = matches[s].replace(regex.path, "");
							var val = getValue(obj, path);
							if (val) el.style.display = "block";
						}
						el.removeAttribute("data-show");
					}
				}
				else if (nn === "data-hide") {
					// src attribute
					matches = nv.match(regex.pattern);
					if (matches) {
						var z = -1;
						var zl = matches.length;
						while (++z < zl) {
							var path = matches[z].replace(regex.path, "");
							var val = getValue(obj, path);
							if (val) el.style.display = "none";
						}
						el.removeAttribute("data-hide");
					}
				}
				else {
					// normal attribute (node name)
					matches = nn.match(regex.pattern);
					if (matches) {
						var x = -1;
						var xl = matches.length;
						while (++x < xl) {
							var path = matches[x].replace(regex.path, "");
							var val = getValue(obj, path);
							if (val) nn = nn.replace(matches[x], val);
							el.setAttribute(nn, val)
							el.removeAttribute(matches[x]);
						}
					}
					// normal attribute (node value)
					if (nv) {
						matches = nv.match(regex.pattern);
						if (matches) {
							var d = -1;
							var dl = matches.length;
							while (++d < dl) {
								var path = matches[d].replace(regex.path, "");
								if (path === "index" && index !== undefined) {
									nv = nv.replace(matches[d], index);
								}
								else {
									var val = getValue(obj, path);
									if (val !== undefined) {
										nv = nv.replace(matches[d], val);
									}
									else {
										nv = nv.replace(matches[d], "");
									}
								}
							}
//							console.log(el.className, 'set > name: ' + nn + ", value: " + nv);
							if (nn === "class" && el.className) el.className = nv;
							else el.setAttribute(nn, nv);
						}
					}
				}
			}
		}
		// process children
		var node = el.firstChild;
		while (node) {
//			var t = new Date().getTime();
			if (isRepeater) return;
			applyTemplate(node, obj, index);
			node = node.nextSibling;
//			console.log(">>", new Date().getTime() - t, el);
		}
	}

	soma.Template = function (source) {

		var tpl, cache, el;

		if (source) setSource(source);

		function setSource(source) {
			tpl = source;
			cache = isElement(tpl) ? tpl.innerHTML : tpl;
		};

		return {
			source: function(source) {
				setSource(source);
			},
			target:function (element) {
				el = element;
				return this;
			},
			compile:function (data) {
				if (!el) {
					if (!isElement(tpl)) throw new Error(errors.COMPILE_NO_ELEMENT);
					else el = tpl;
				}
				el.innerHTML = cache;
				applyTemplate(el, data);
				return this;
			},
			dispose: function() {
				tpl = null;
				cache = null;
				el = null;
				return this;
			}
		}
	};

	// register for AMD module
	if (typeof define === 'function' && define.amd) {
		define("soma-template", soma);
	}

	// export for node.js
	if (typeof exports !== 'undefined') {
		if (typeof module !== 'undefined' && module.exports) {
			exports = module.exports = soma;
		}
		exports = soma;
	}

})(this['soma'] = this['soma'] || {});