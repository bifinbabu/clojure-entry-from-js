//--------------------------------------------------------------------------------------------------------------

// Author: Manoj
// Date  : 11/09/2018

//--------------------------------------------------------------------------------------------------------------

// Misc

const catchErrors = fn => {
	try {
		fn();
	} catch (err) {
		console.error(err);
	}
};
const isEven = n => n % 2 == 0;
const isNotEmpty = l => l.length > 0;
const isNotEmptyString = s => s != "";
const trim = s => s.trim();
const equals = (x, y) => x == y;
const getValueOfKey = (list, key, defaultValue = undefined) => {
	// [a b c d e f]: a => b, c=> d, e => f, g => defaultValue
	let index = -1;
	list.forEach((token, i) => {
		if (token == key) index = i + 1;
	});
	return index < 0 ? defaultValue : list[index];
};
const toTitleCase = str =>
	str
		.split(" ")
		.map(trim)
		.filter(isNotEmptyString)
		.map(word => word[0].toUpperCase() + word.substr(1).toLowerCase())
		.join(" ");
const immediately = fn => setTimeout(fn, 1);
const afterSomeTime = fn => setTimeout(fn, 5000);

//--------------------------------------------------------------------------------------------------------------

// DSL processing

const type = (name, val = null, extra) => {
	return { type: name, value: val, extra };
};
const typeError = error => {
	return { error };
};
const types = {
	String: val => type("String", val, val),
	Integer: val => {
		let intVal = parseInt(val);
		return intVal.toString() == val.toString()
			? type("Integer", intVal, val)
			: typeError("that is an invalid integer");
	}
};
const isTypeError = val => val.hasOwnProperty("error");
const defType = (name, parentType, validator, errorMsg) => {
	types[name] = val => {
		let x = types[parentType](val);
		if (isTypeError(x)) return x;
		x = validator(x.value);
		return x != undefined ? type(name, x, val) : typeError(errorMsg);
	};
};
const matchFirstNChars = (n, x, y) => {
	const x1 = x.toLowerCase();
	const y1 = y.toLowerCase();
	return y1.length >= n && x1.substr(0, y1.length) == y1;
};
const comparers = {
	equals: equals,
	caseInsensitive: (x, y) => equals(x.toLowerCase(), y.toLowerCase()),
	matchFirstChar: matchFirstNChars.bind(null, 1),
	matchFirst2Chars: matchFirstNChars.bind(null, 2)
};
const validators = {
	identity: () => val => val,
	set: (set, compare = comparers.equals) => {
		const s = set.map(i => [i[0].split(","), i[1]]);
		return val => {
			let x = val.toString();
			let y = s.find(i => i[0].find(j => compare(j, x)) != undefined);
			return y ? y[1] : y;
		};
	},
	range: (low, high) => val => (low <= val && val <= high ? val : undefined)
};
const watchers = [];
const watch = fn => {
	if (watchers.indexOf(fn) < 0) watchers.push(fn);
};
const notifyWatchers = chat => watchers.forEach(w => w(chat));
const evalJS = js => eval("`" + js.split("{").join("${") + "`");
const getDataItem = code =>
	evalJS(
		code
			.split("<")
			.join("{get('")
			.split(">")
			.join("')}")
	);
const evalJSFn = fn =>
	evalJS(
		fn
			.split("[")
			.join("{")
			.split("]")
			.join("()}")
	);
const getDisplayText = txt =>
	txt
		.split(" ")
		.map(word => (word.indexOf("{") >= 0 ? evalJS(word) : word))
		.map(word => (word.indexOf("<") >= 0 ? getDataItem(word) : word))
		.map(word => (word.indexOf("[") >= 0 ? evalJSFn(word) : word))
		.join(" ");
const get = param => st.data[param].value;
const dslCommand = {
	type: cmd => {
		const name = cmd[1];
		const parentType = cmd[2];
		const validator = (typeDef => {
			if (typeDef.length < 4) return validators.identity(); // Just an alias
			let compareFn = comparers.equals;
			let startIndex = 3;
			let endIndex = typeDef.length;
			let validatorType = "set";
			if (typeDef[3] != "=") {
				compareFn = comparers[typeDef[3]];
				startIndex = 4;
			}
			const params = typeDef.filter((x, i) => {
				if (x == "!") endIndex = i;
				if (x == "..") validatorType = "range";
				return (
					startIndex < i && i < endIndex && !(x == ":" || x == "..")
				);
			});
			switch (validatorType) {
				case "set":
					return validators.set(
						params.reduce((acc, x, i) => {
							if (isEven(i)) acc.push([null, x]);
							else acc[acc.length - 1][0] = x;
							return acc;
						}, []),
						compareFn
					);
				case "range":
					return validators.range(
						parseInt(params[0]),
						parseInt(params[1])
					);
			}
		})(cmd);
		const errorMessage = getValueOfKey(cmd, "!", "invalid data");
		st.types[cmd[1]] = defType(name, parentType, validator, errorMessage);
		return { type: "type" };
	},
	let: cmd => {
		let result = types[cmd[3]](cmd[5]);
		st.data[cmd[1]] = result;
		return { type: "let" };
	},
	if: cmd => {
		const cond = evalJS(`{${cmd[1]}}`) == "true";
		if (!cond) {
			do {
				st.indexAST++;
			} while (st.AST[st.indexAST][0] != "end-if");
		}
		return { type: "if" };
	},
	"end-if": cmd => {
		return { type: "end-if" };
	},
	say: cmd => {
		return { type: "say", data: getDisplayText(cmd[1]) };
	},
	ask: cmd => {
		const ifCond = getValueOfKey(cmd, "only-if", undefined);
		if (ifCond) {
			const result = evalJS(`{${ifCond}}`) == "true";
			if (!result) return { type: undefined };
		}
		return {
			type: "ask",
			data: getDisplayText(cmd[1]),
			dataType: getValueOfKey(cmd, ":")
		};
	},
	pause: cmd => {
		return {
			type: "say",
			data: Array(160)
				.fill(".")
				.join("")
		};
	}
};
const parseDSL = dsl => {
	const startsWithKeyword = line =>
		Object.keys(dslCommand).find(k => line.indexOf(k) == 0);
	const multiLineCommands2SingleLines = (ast, l) => {
		if (startsWithKeyword(l)) ast.push(l);
		else ast[ast.length - 1] += " " + l;
		return ast;
	};
	const split2Tokens = (t, i) => (isEven(i) ? t.split(" ") : t); // strings in quotes will be single tokens
	const extractTokens = line =>
		line
			.split("//")[0]
			.split('"')
			.map(split2Tokens)
			.reduce((acc, val) => acc.concat(val), []) // flatten
			.filter(isNotEmpty);
	return dsl
		.split("\t")
		.join(" ")
		.split("\n")
		.map(trim)
		.filter(isNotEmpty)
		.reduce(multiLineCommands2SingleLines, [])
		.map(extractTokens);
};
const state = {
	persistant: {
		inputs: []
	},
	transient: {
		AST: [],
		indexAST: 0,
		indexInput: 0,
		types: {},
		chat: [],
		data: {},
		commandResult: undefined
	}
};
let sp = state.persistant; // alias
let st = state.transient; // alias
const isChatCompleted = () => st.indexAST >= st.AST.length;
const isInputAvailable = () => sp.inputs.length > st.indexInput;
const getNextInput = () => sp.inputs[st.indexInput];
const interpretDSL = () => {
	const requiresDisplay = type => ["say", "ask"].indexOf(type) >= 0;
	if (isChatCompleted()) {
		notifyWatchers();
		return;
	}
	const cmd = st.AST[st.indexAST];
	const result = dslCommand[cmd[0]](cmd); // Execute command
	st.commandResult = result;
	if (requiresDisplay(result.type)) {
		st.chat.push(result);
		notifyWatchers(result);
	}
	const proceed = () => immediately(() => completeCommand());
	if (result.type == "ask") {
		if (isInputAvailable()) proceed();
		// else: Wait for the user to provide input
	} else {
		proceed();
	}
};
const completeCommand = () => {
	const cmd = st.AST[st.indexAST];
	let isErrorResponse = false;
	if (st.commandResult.type == "ask") {
		const response = getNextInput();
		notifyWatchers({ type: "response", data: response });
		st.indexInput++;
		// Process response
		const targetVariable = getValueOfKey(cmd, ">>");
		const targetType = getValueOfKey(cmd, ":");
		let result = types[targetType](response);
		if (isTypeError(result)) {
			notifyWatchers({
				type: "say",
				data: `Sorry, ${result.error}. Try again.`
			});
			isErrorResponse = true;
		} else st.data[targetVariable] = result;
	}
	if (!isErrorResponse) st.indexAST++;
	interpretDSL();
};

// Note: Safari 11+ does not allow localStorage access from file:// by default
// Hence those errors need to be suppressed
const persistState = () =>
	catchErrors(() => (localStorage.feedbackManoj = JSON.stringify(sp)));
const loadPersistedState = () =>
	catchErrors(() => {
		state.persistant = JSON.parse(
			localStorage.feedbackManoj || `{ "inputs": [] }`
		);
		sp = state.persistant;
		st.indexInput = 0;
	});

//--------------------------------------------------------------------------------------------------------------

// Custom functions used in DSL

const greet = () => {
	const hr = new Date().getHours();
	return `Good ${hr < 12 ? "morning" : hr < 16 ? "afternoon" : "evening"}`;
};
const notMemberOf = group =>
	isTypeError(types[group](st.data.Name.extra.toLowerCase()));
const memberOf = group => !notMemberOf(group);
const nameIs = name => st.data.Name.extra.toLowerCase() == name;
const nameIsNot = name => !nameIs(name);
const firstName = () => st.data.Name.value.split(" ")[0];
const isYes = param => st.data[param].value == "Yes";
const isNo = param => st.data[param].value == "No";
const isNotGoodEnough = param =>
	st.data.hasOwnProperty(param) &&
	st.data[param].value > 0 &&
	st.data[param].value < 5;

//--------------------------------------------------------------------------------------------------------------

// GUI

const el = id => document.getElementById(id);
const html = id => el(id).innerHTML;
const chatHistoryEl = el("chat-history");
const queryTemplate = html("query-template");
const responseTemplate = html("response-template");
const responseEl = el("response-input");
const feedbackTemplate = html("feedback-template");
const feedbackItemTemplate = html("feedback-item-template");
const feedbackEl = el("feedback");
const getResponse = () => responseEl.value.trim();
const clearResponseEl = () => (responseEl.value = "");
const focusOnResponseEl = () => responseEl.focus();
const hideResponseEl = () => {
	responseEl.style.display = "none";
	el("submit-btn").style.display = "none";
};
const showResponseEl = () => {
	responseEl.style.display = "block";
	el("submit-btn").style.display = "inline-block";
};
const add2ChatHistory = text => {
	let node = document.createElement("div");
	node.innerHTML = text;
	chatHistoryEl.appendChild(node);
};
const setInputHeight = dataType =>
	(responseEl.style.height = dataType != "Comment" ? "20px" : "200px");
const addSystemChat = query => {
	add2ChatHistory(eval("`" + queryTemplate + "`"));
};
const addUserChat = response => {
	add2ChatHistory(eval("`" + responseTemplate + "`"));
};
const displayRating = value => {
	const template = html(
		"rating-" +
			(value < 5 ? "bad" : value < 8 ? "normal" : "good") +
			"-template"
	);
	return eval("`" + template + "`");
};
const showEntireFeedback = () => {
	const feedback = st.data;
	const feedbackItems = Object.keys(feedback)
		.map(key => {
			if (key[0] != "_" && key != "Name") {
				const name = key;
				const isRating = key.indexOf(" Rating") > 0;
				const value = isRating
					? displayRating(feedback[key].value)
					: feedback[key].value.split("\n").join("<br/>");
				if (isRating && feedback[key].value == 0) return "";
				return eval("`" + feedbackItemTemplate + "`");
			}
			return "";
		})
		.join("\n");
	const userName = feedback.Name.value;
	feedbackEl.innerHTML = eval("`" + feedbackTemplate + "`");
};
const scrollToPageBottom = () =>
	window.scroll({
		top: document.body.scrollHeight,
		left: 0,
		behavior: "smooth"
	});
watch(chat => {
	if (chat) {
		switch (chat.type) {
			case "say":
				addSystemChat(chat.data);
				hideResponseEl();
				scrollToPageBottom();
				break;
			case "ask":
				addSystemChat(chat.data);
				showResponseEl();
				focusOnResponseEl();
				setInputHeight(chat.dataType);
				scrollToPageBottom();
				break;
			case "response":
				addUserChat(chat.data.split("\n").join("<br/>"));
				break;
			default:
				hideResponseEl();
				break;
		}
	} else {
		// Chat completed
		showEntireFeedback();
		afterSomeTime(scrollToPageBottom);
	}
});
const processInput = () => {
	let response = getResponse();
	if (response.length > 0) {
		sp.inputs.push(response);
		clearResponseEl();
		persistState();
		completeCommand();
	}
};
const responseEvent = e => {
	if (e.keyCode == 13 && (e.ctrlKey || e.target.style.height == "20px"))
		processInput();
};
const reset = e => {
	sp.inputs = [];
	state.transient = {
		AST: st.AST,
		indexAST: 0,
		indexInput: 0,
		types: {},
		chat: [],
		data: {}
	};
	st = state.transient;
	persistState();
	location.reload();
};

//--------------------------------------------------------------------------------------------------------------

// Start

st.AST = parseDSL(dsl);
loadPersistedState();
interpretDSL();

//--------------------------------------------------------------------------------------------------------------
