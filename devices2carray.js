////////////////////////////////////////////////////////////////////////////////
// devmm2name :: Device Major/Minor to string converter
//	(C)2019 Dark Embedded Systems
//	http://e.dark-x.net/
//
// You can choose one of following licenses:
//	* Project Open License v1.0 or later
//	* Dark Embedded Systems License v1.0 or later
//	* Apache License Version 2.0 or later
//	* GNU General Public License, version 2 or later
////////////////////////////////////////////////////////////////////////////////

undefined = ((function(){return;})());

function outputError(e){
	document.getElementById('error').innerText += e + '\n--------------------------------------------------\n';
}

function parseText(txt){
	var line = txt.split('\n');

	var block = [];
	var char = [];

	var current = char;
	var major = 0;
	var minor = 0;
	var name = '';

	var pvRepeat = false;
	for(var i=0; i<line.length; i++){

		//Change current type
		var l = line[i].substr(0,4);
		var m = parseInt(l);
		if(isFinite(m) && (l.indexOf('\t') == -1) ){
			major = m;
			if(line[i].substr(0,16).indexOf('block') != -1){
				current = block;
			}

			if(line[i].substr(0,16).indexOf('char') != -1){
				current = char;
			}

			current[m] = [];
			continue;
		}

		// Treat '...' as omit expression.
		var repeat = (line[i].trim() == '...')
		if(repeat){
			if(!pvRepeat){ //Ignore continuous of '...'
				current[major].push(-1);
			}
			pvRepeat = true;
		} else {
			pvRepeat = false;
		}

		// If line has '=', this is definition.
		var p = line[i].indexOf('=');
		if(p == -1){ continue; }

		// If no number before '=', this is invalid.
		minor = parseInt(line[i].substr(0, p));
		if(!isFinite(minor)){ continue; }

		// Name is placed after '='
		name = line[i].substr(p+1).trim();

		// If name has ' ', it includes descrption. cut required.
		p = name.indexOf(' ');
		if(p != -1){
			name = name.substr(0, p);
		}

		// If name has '?', this is not definition. examples.
		if((name.indexOf('?')) != -1){ continue; }

		// Add valid definitions.
		current[major][minor] = name;
	}

	return {c: char, b: block};
}

function removeRange(a, start, end){
	if(!end){end=start;}
	for(var i=start; i<=end; i++){
		a[i] = [];
	}
}

function removeRareOrLegacyDevices(r){
	removeRange(r.c, 12);
	removeRange(r.c, 16, 25);
	removeRange(r.c, 27, 28);
	removeRange(r.c, 30, 35);
	removeRange(r.c, 38, 39);
	removeRange(r.c, 41, 41);
	removeRange(r.c, 43, 59);
	removeRange(r.c, 64, 88);
	removeRange(r.c, 90); //Patch required
	removeRange(r.c, 92);
	removeRange(r.c, 101);
	removeRange(r.c, 103);
	removeRange(r.c, 105, 107);
	removeRange(r.c, 110);
	removeRange(r.c, 112, 115);
	removeRange(r.c, 117, 118);
	removeRange(r.c, 145, 158);
	removeRange(r.c, 164, 170);
	removeRange(r.c, 172, 179);
	removeRange(r.c, 181, 185);
	removeRange(r.c, 190);
	removeRange(r.c, 196, 201);
	removeRange(r.c, 206);
	removeRange(r.c, 210, 212);
	removeRange(r.c, 218, 220);
	removeRange(r.c, 224, 230);

	removeRange(r.b, 15, 18);
	removeRange(r.b, 20, 21);
	removeRange(r.b, 23, 30);
	removeRange(r.b, 32);
	removeRange(r.b, 36, 38);
	removeRange(r.b, 48, 55);
	removeRange(r.b, 72, 79);
	removeRange(r.b, 94);
	removeRange(r.b, 101);
	removeRange(r.b, 104, 113);
	removeRange(r.b, 115);
	removeRange(r.b, 136, 146);
	removeRange(r.b, 160, 161);

	removeRange(r.c, 256);
	removeRange(r.c, 384);

}


function findNext(b, start){
	for(var n=start; n<256; n++){
		if((b[n] !== undefined) && (!isFinite(b[n]))){
			return n-1;
		}
	}
	return 255;
}

function fillRepeatsFixed(b, base, startN, endN, startStr, hex){
	var startStrI = parseInt(startStr);

	for(var n=startN; n<=endN; n++){
		b[n] = base + startStrI;
		startStrI++;
	}
}

function fillRepeats(b, base, startN, endN, firstNum, hex){
	if((endN - startN) <= 4){
		return fillRepeatsFixed.apply(undefined, arguments);
	}
	var firstNumI = parseInt(firstNum);
	var n = startN;

	b[n++] = 'DEVMM_REPEAT';
	b[n++] = 'DEVMM_REPEAT_BASE("' +  base + '")';
	b[n++] = 'DEVMM_REPEAT_FIRST(' + firstNum + ')';

	var i=3; //0: DEVMM_REPEAT, 1: DEVMM_REPEAT_BASE, 2: DEVMM_REPEAT_FIRST
	for(; n<=endN; n++){
		b[n] = 'DEVMM_REPEATED('+(i++)+')';
	}
}


function expandRepeats(a, fillMethod){
	for(var i=0; i<a.length; i++){
		if(a[i] === undefined){ continue; }
		for(var n=0; n<256; n++){
			if(a[i][n] == -1){
				var parent = a[i][n-1];
				var rex = parent.match(/(.*?)([0-9]+)(.*)/);

				if(rex == null){ //Unsupported: unrepeatable. may be mistake.
					a[i][n] = undefined;
					break;
				}

				var base = rex[1];
				var num = rex[2];
				var suffix = rex[3];

				var startN = n;
				var startStr = 1 + parseInt(num);
				var endN = findNext(a[i], startN+1);
				if(a[i][endN+1] !== undefined){
					var endBase = a[i][endN+1].substr(0, base.length);
					if(base == endBase){
						endStr = a[i][endN+1].substr(base.length);
					} else { // next is other definiton, ignore and guess number format is integer.
						endStr = '0';
					}
				} else { // next is not defined, guess number format is integer.
					endStr = '0';
				}
				
				if(fillMethod === undefined){fillMethod = fillRepeats;}
				
				fillMethod(a[i], rex[1], startN, endN, startStr);
			}
		}
	}
}

function getNextIdString(c){
	var ccode = c.charCodeAt(c.length - 1);
	var ccodeZ = 'z'.charCodeAt(0);
	var r = String.fromCharCode(++ccode);
	if( ccode > ccodeZ){
		if(c.length == 1){
			return 'aa'; // z + 1 = aa;
		} else {
			return (getNextIdString(c.substr(0, (c.length-1))) + 'a'); //call self with 'c in arg (without final 1 char)' + new digit 'a'
		}
	}
	return (c.substr(0, (c.length-1)) + r); //Merge 'c in arg (without final 1 char)' + incresed char
}

function generateStorageDefinitionFixed(c, base, startN, endN, interval, firstStr){
	var i=startN;
	for(var n=0; n<endN; n++){
		var baseEx = base + firstStr;
		c[i++] = baseEx;

		for(var m=1; m<interval; m++){
			c[i++] = baseEx + m;
		}

		firstStr = getNextIdString(firstStr);
	}
}

function generateStorageDefinitionWithPFixed(c, base, startN, endN, interval, firstNum){
	var i=startN;
	for(var n=0; n<endN; n++){
		var baseEx = base + firstNum;
		c[i++] = baseEx;

		for(var m=1; m<interval; m++){
			c[i++] = baseEx + 'p' + m;
		}

		firstNum = firstNum+1;
	}
}

function generateStorageDefinition(c, base, startN, endN, interval, firstStr){
	if(interval <= 4){
		return generateStorageDefinitionFixed.apply(undefined, arguments);
	}
	var i=startN;
	for(var n=0; n<endN; n++){
		var baseEx = base + firstStr;
		c[i++] = 'DEVMM_STORAGE';
		c[i++] = 'DEVMM_STORAGE_BASE("' +  base + '")';
		c[i++] = 'DEVMM_STORAGE_FIRST("' + firstStr + '")';

		for(var m=3; m<interval; m++){
			c[i++] = 'DEVMM_STORAGE_REPEATED(' + m + ')';
		}
		firstStr = getNextIdString(firstStr);
	}
}

function generateStorageDefinitionWithP(c, base, startN, endN, interval, firstNum){
	if(interval <= 4){
		return generateStorageDefinitionWithPFixed.apply(undefined, arguments);
	}
	var i=startN;
	for(var n=0; n<endN; n++){
		var baseEx = base + firstNum;
		c[i++] = 'DEVMM_STORAGE_P';
		c[i++] = 'DEVMM_STORAGE_P_BASE("' +  base + '")';
		c[i++] = 'DEVMM_STORAGE_P_FIRST(' + firstNum + ')';

		for(var m=3; m<interval; m++){
			c[i++] = 'DEVMM_STORAGE_P_REPEATED(' + m + ')';
		}

		firstNum = firstNum+1;
	}
}

function dumpArray(a){
	var r = '';
	for(var i=0; i<a.length; i++){
		if(a[i] == undefined){
			r += '\t0, \n';
			continue;
		}
		if(
			((typeof a[i]) == 'number')
			||
			(a[i].indexOf('DEVMM_') != -1)
		){
			r += '\t' + a[i] + ', \n';
			continue;
		}

		r += '\t"' + a[i] + '", \n';
	}
	return r;
}


function dumpAsCArrayFixed(a, name){
	var r  = 'char* table_' + name + '[DEVMM_MAX_MAJOR][DEVMM_MAX_MINOR] = {\n';

	for(var i=0; i<a.length; i++){
		if(a[i] === undefined){ 
			r+= '/* ' + i + ' */\t {},\n';
			continue;
		}
		r += '/* ' + i + ' */\t {"' + a[i].join('","') + '"},\n';
	
	
	}

	return (r + '};\n');
}


function dumpAsCArrayPartial(a, name){
	var r  = '';

	for(var i=0; i<a.length; i++){
		if((a[i] === undefined) || (a[i].length == 0)){ 
			continue;
		}
		r += 'char* table_' + name + '_' + i + '[DEVMM_MAX_MINOR] = {\n' + dumpArray(a[i]) + '\n};\n';
	}

	return r;
}

function generateAllStorageDefinitions(r){
	var g = generateStorageDefinition;
	var gWithP = generateStorageDefinitionWithP;
	g(r.b[3], '/dev/hd', 0, 2, 64, 'a');
	g(r.b[8], '/dev/sd', 0, 16, 16, 'a');
	g(r.b[22], '/dev/hd', 0, 2, 64, 'c');
	g(r.b[33], '/dev/hd', 0, 2, 64, 'e');
	g(r.b[34], '/dev/hd', 0, 2, 64, 'g');
	g(r.b[44], '/dev/ftl', 0, 16, 16, 'a');
	g(r.b[45], '/dev/pd', 0, 4, 16, 'a');
	g(r.b[56], '/dev/hd', 0, 2, 64, 'i');
	g(r.b[57], '/dev/hd', 0, 2, 64, 'k');

	g(r.b[65], '/dev/sd', 0, 16, 16, 'q');

	g(r.b[66], '/dev/sd', 0, 16, 16, 'ag');
	g(r.b[67], '/dev/sd', 0, 16, 16, 'aw');
	g(r.b[68], '/dev/sd', 0, 16, 16, 'bm');
	g(r.b[69], '/dev/sd', 0, 16, 16, 'cc');
	g(r.b[70], '/dev/sd', 0, 16, 16, 'cs');
	g(r.b[71], '/dev/sd', 0, 16, 16, 'di');

	g(r.b[80], '/dev/i2o/hd', 0, 16, 16, 'a');
	g(r.b[81], '/dev/i2o/hd', 0, 16, 16, 'q');
	g(r.b[82], '/dev/i2o/hd', 0, 16, 16, 'ag');
	g(r.b[83], '/dev/i2o/hd', 0, 16, 16, 'aw');
	g(r.b[84], '/dev/i2o/hd', 0, 16, 16, 'bm');
	g(r.b[85], '/dev/i2o/hd', 0, 16, 16, 'cc');
	g(r.b[86], '/dev/i2o/hd', 0, 16, 16, 'cs');
	g(r.b[87], '/dev/i2o/hd', 0, 16, 16, 'di');

	g(r.b[88], '/dev/hd', 0, 2, 64, 'm');
	g(r.b[89], '/dev/hd', 0, 2, 64, 'o');
	g(r.b[90], '/dev/hd', 0, 2, 64, 'q');
	g(r.b[91], '/dev/hd', 0, 2, 64, 's');

	g(r.b[93], '/dev/nftl', 0, 16, 16, 'a');
	g(r.b[96], '/dev/inftl', 0, 16, 16, 'a');
	g(r.b[98], '/dev/ubd', 0, 16, 16, 'a');
	g(r.b[102], '/dev/cbd/', 0, 16, 16, 'a');

	g(r.b[128], '/dev/sd', 0, 16, 16, 'dy');
	g(r.b[129], '/dev/sd', 0, 16, 16, 'eo');
	g(r.b[130], '/dev/sd', 0, 16, 16, 'fe');
	g(r.b[131], '/dev/sd', 0, 16, 16, 'fu');
	g(r.b[132], '/dev/sd', 0, 16, 16, 'gk');
	g(r.b[133], '/dev/sd', 0, 16, 16, 'ha');
	g(r.b[134], '/dev/sd', 0, 16, 16, 'hq');
	g(r.b[135], '/dev/sd', 0, 16, 16, 'ig');

	gWithP(r.b[153], '/dev/emd/', 0, 16, 16, 0);
	gWithP(r.b[179], '/dev/mmcblk', 0, 32, 8, 0);
	g(r.b[180], '/dev/ub', 0, 32, 8, 'a');
	g(r.b[202], '/dev/xvd', 0, 16, 16, 'a');
	g(r.b[256], '/dev/rfd', 0, 16, 16, 'a');
	g(r.b[257], '/dev/ssfdc', 0, 32, 8, 'a');
}

function generateReadFunction(a, name){
	var r = 'char** ReadDevMMTable_' + name + '(int Major){\n\tswitch(Major){\n';

	for(var i=0; i<a.length; i++){
		if((a[i] === undefined) || (a[i].length == 0)){ 
			continue;
		}

		r += '\t\tcase '+i+': return table_' + name + '_'+i+';\n'
	}

	r += '\t}\n\treturn 0;\n\t}\n';
	return r;
}

function generateChar90(c){
	var n=0;
	for(var i=0; i<16; i++){
		c[90][n++] = '/dev/mtd'+i;
		c[90][n++] = '/dev/mtdr'+i;
	}
}

function devices2carray(){
	var r = parseText(document.getElementById('devices.txt').value);
	removeRareOrLegacyDevices(r);
	expandRepeats(r.c);
	expandRepeats(r.b);
	generateAllStorageDefinitions(r);

	generateChar90(r.c);

	outC = dumpAsCArrayPartial(r.c, 'char');
	outB = dumpAsCArrayPartial(r.b, 'block');
	outF = generateReadFunction(r.c, 'char');
	outF += generateReadFunction(r.b, 'block');

	document.getElementById('output').value = outC + '\n\n' + outB+ '\n\n' + outF;
}
devices2carray();
