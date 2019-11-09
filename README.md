## devmm2name :: Linux device major/minor to string converter
	(C)2019 Dark Embedded Systems
	http://e.dark-x.net/

### Usage:
	devmm2name <char|block> <Major>:<Minor>
	devmm2name <char|block> <Major> <Minor>

### Examples:
	devmm2name char 4:0
	devmm2name block 8 1
	devmm2name c 4 1
	devmm2name b 179:5

### (on Linux) Make special file:
	devmm2name <mkchar|mkblock> <Major>:<Minor>
	devmm2name <mkchar|mkblock> <Major> <Minor>

### (on Linux) Scan and make special files (No result shown, root required):
	devmm2name scan				(Overwrite all special files)
	devmm2name update			(Update special files if not exist)
	devmm2name watch [Interval(s)]		(Update every interval secs)

### Licenses:
	You can choose one of following licenses:
	* Project Open License v1.0 or later (http://e.dark-x.net/licenses/pol/v1.0)
	* Dark Embedded Systems License v1.0 or later (http://e.dark-x.net/licenses/desl/v1.0)
	* Apache License Version 2.0 or later (https://www.apache.org/licenses/LICENSE-2.0)
	* GNU General Public License, version 2 or later (https://www.gnu.org/licenses/old-licenses/gpl-2.0)

	Note:
	"LICENSE" file is not included.
	If you want to redistribute this software, obtain the selected license document from the above website.

	In future versions, some licenses may not apply.

### How to build
#### Common (Only required if you need to update 'devices.txt.h'):
	Download devices.txt from https://kernel.org/doc/html/latest/admin-guide/devices.html
	Open "devices2carray.html" with web browser.
	Copy and paste text part of devices.txt to textbox labeled: 'devices.txt:' 
	Press 'Convert devices.txt to devices.txt.h' button to generate 'devices.txt.h'
	If no error occured, will shown results to textbox labeled: 'devices.txt.h:'
	Copy and paste text to new file 'devices.txt.h'.
link: [devices.txt](https://kernel.org/doc/html/latest/admin-guide/devices.html)

#### Windows:
	cl devmm2name.cpp

#### Linux:
	./configure
	make
