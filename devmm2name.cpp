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

#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#include <string.h>

#if defined(__linux) || defined(linux)
	#include <dirent.h>
	#include <errno.h>
	#include <unistd.h>
	#include <sys/stat.h>
	#include <sys/types.h>
	#include <linux/kdev_t.h>
#endif

#define DEVMM_MAX_MAJOR 512
#define DEVMM_MAX_MINOR 256
#define DEVMM_MIN_PERMITTED_AUTOREPEAT 4

#define DEVMM_REPEAT ((char*) 0xFFFFFFFF)
#define DEVMM_REPEAT_BASE(n) n
#define DEVMM_REPEAT_FIRST(n) ((char*)n)
#define DEVMM_REPEATED(n) ((char*)n)

#define DEVMM_STORAGE ((char*) 0xFFFFFFFE)
#define DEVMM_STORAGE_BASE(n) n
#define DEVMM_STORAGE_FIRST(n) n
#define DEVMM_STORAGE_REPEATED(n) ((char*)n)

#define DEVMM_STORAGE_P ((char*) 0xFFFFFFFD)
#define DEVMM_STORAGE_P_BASE(n) n
#define DEVMM_STORAGE_P_FIRST(n) ((char*)n)
#define DEVMM_STORAGE_P_REPEATED(n) ((char*)n)

#define DEVMM_ERROR_INVALID_TABLE "E: Table definition is invalid. Regenerate devices.txt.h and rebuild.\n"
#define DEVMM_ERROR_NO_AUTOREPEATABLE "E: GetAutoRepeatableValue: Specified 'MarkerPos' is not pointed valid marker. This may be bug of this software.\n"

#include "devices.txt.h"

static const char* BLANK_STR = 0;
static char TEMP[512];
static int MTDBLOCK_MAJOR = 0;


int IsSpecialTokens(char* Name){
	if((Name == DEVMM_REPEAT) || (Name == DEVMM_STORAGE) || (Name == DEVMM_STORAGE_P)){
		return 1;
	}
	return 0;
}

char** ReadDevMMTable(char Type, int Major){
	switch(Type){
		case 'b': return ReadDevMMTable_block(Major);
		case 'c': return ReadDevMMTable_char(Major);
	}
	return 0;
}

int MakeDir(const char* Path){
	char D[512];
	D[0] = Path[0]; //Skip to make '/'

	for(int i=1; i<511; i++){ //1: '/'
		D[i] = Path[i];
		switch(Path[i]){
			case 0x00: return 0;
			case '/':
				D[i+1] = 0x00;
				mkdir(D, S_IRWXU | S_IRWXG | S_IROTH);
				break;
		}
	}
	return 0;
}

char* GetAutoRepeatableValue(char** Table, int MarkerPos, int ReadPos){
	if(MarkerPos > (DEVMM_MAX_MINOR - DEVMM_MIN_PERMITTED_AUTOREPEAT)){fprintf(stderr, DEVMM_ERROR_INVALID_TABLE);return ((char*)BLANK_STR);}

	char *Name = Table[MarkerPos];
	char *Base = Table[MarkerPos+1];
	char *StartStr = Table[MarkerPos+2];

	if(!IsSpecialTokens(Name)){
		fprintf(stderr, DEVMM_ERROR_NO_AUTOREPEATABLE);
		return "";
	}

	if(Name == DEVMM_REPEAT){
		StartStr += ReadPos;
		sprintf(TEMP, "%s%i", Base, StartStr);
		return TEMP;
	}
	if(Name == DEVMM_STORAGE){
		if(ReadPos == 0){ 
			sprintf(TEMP, "%s%s", Base, StartStr);
		} else {
			sprintf(TEMP, "%s%s%i", Base, StartStr, ReadPos);
		}
		return TEMP;
	}
	if(Name == DEVMM_STORAGE_P){
		if(ReadPos == 0){ 
			sprintf(TEMP, "%s%i", Base, StartStr);
		} else {
			sprintf(TEMP, "%s%ip%i", Base, StartStr, ReadPos);
		}
		return TEMP;
	}
	return "";
}


const char* DevMM2Name(char Type, int Major, int Minor){
	//If request exceeded the upper limit, return default value.
	if((Major > DEVMM_MAX_MAJOR) || (Minor > DEVMM_MAX_MINOR)){
		return BLANK_STR;
	}

	//If env "DEVMM2NAME_MTDBLOCK_MAJOR" is defined, override return value to '/dev/mtdblock<Minor>'
	if( (MTDBLOCK_MAJOR != 0) && (Major == MTDBLOCK_MAJOR) ){
		sprintf(TEMP, "/dev/mtdblock%i", Minor);
		return TEMP;
	}

	//ReadDevMMTable: if no table defined, return default value.
	char** Table = ReadDevMMTable(Type, Major);
	if(Table == 0){return BLANK_STR;}

	//Read name from table: If the specified minor is not defined, return default value.
	char* Name = Table[Minor];
	if(Name == 0){return BLANK_STR;}

	//Special tokens: read 2 next value to get extra information.
	if(IsSpecialTokens(Name)){
		return GetAutoRepeatableValue(Table, Minor, 0);
	}

	//CIf 'Minor-1' or 'Minor-2' is special tokens, current value is not returnable value: This is Base or StartStr definition.
	if((Minor >= 1) && (IsSpecialTokens(Table[Minor-1]))){
		return GetAutoRepeatableValue(Table, Minor-1, 1);
	}
	if((Minor >= 2) && (IsSpecialTokens(Table[Minor-2]))){
		return GetAutoRepeatableValue(Table, Minor-2, 2);
	}

	//If table value is smaller than DEVMM_MAX_MINOR, current value is not returnable value: This is *_REPEATED token.

	if((intptr_t)Name < DEVMM_MAX_MINOR){
		//Back to value of 'Name', there is special tokens.
		int Back = *((int*)(&Name));
		return GetAutoRepeatableValue(Table, Minor-Back, Back);
	}
	return Name;
}

void ShowUsage(char* self){
	fprintf(stderr, "devmm2name :: Device Major/Minor to string converter\n");
	fprintf(stderr, "	(C)2019 Dark Embedded Systems\n");
	fprintf(stderr, "	http://e.dark-x.net/\n");
	fprintf(stderr, "\n");
	fprintf(stderr, "Convert device Major/Minor number to /dev/ path string:\n");
	fprintf(stderr, "	%s <char|block> <Major>:<Minor>\n", self);
	fprintf(stderr, "	%s <char|block> <Major> <Minor>\n", self);

	fprintf(stderr, "\n");
	fprintf(stderr, "	Examples:\n");
	fprintf(stderr, "		%s char 4:0\n", self);
	fprintf(stderr, "		%s block 8 1\n", self);
	fprintf(stderr, "		%s c 4 1\n", self);
	fprintf(stderr, "		%s b 179:1\n", self);

#if defined(__linux) || defined(linux)
	fprintf(stderr, "\n");
	fprintf(stderr, "Make special file (No result shown, root required):\n");
	fprintf(stderr, "	%s <mkchar|mkblock> <Major>:<Minor>\n", self);
	fprintf(stderr, "	%s <mkchar|mkblock> <Major> <Minor>\n", self);
	fprintf(stderr, "\n");
	fprintf(stderr, "	Examples:\n");
	fprintf(stderr, "		%s mkchar 4:0\n", self);
	fprintf(stderr, "		%s mkblock 8 1\n", self);
	fprintf(stderr, "\n");
	fprintf(stderr, "Scan and make special files (No result shown, root required):\n");
	fprintf(stderr, "	%s scan		(Overwrite all special files)\n", self);
	fprintf(stderr, "	%s update		(Update special files if not exist)\n", self);
	fprintf(stderr, "	%s watch [Interval(s)]	(Update every interval secs)\n", self);
	fprintf(stderr, "\n");
#endif

}

int CheckMknodMode(char* Argv1){
	if((Argv1[0] == 'm') && (Argv1[1] != 0x00) && (Argv1[1] == 'k')&& (Argv1[2] != 0x00) ){
		return 1;
	}
	return 0;
}


int MknodEx(const char* result, char Type, int Major, int Minor, int OnlyUpdateIfNotFound){
#if defined(__linux) || defined(linux)
	int R = 0;
	int mode = 0;

	if(Type == 'b'){ mode = S_IFBLK; }
	if(Type == 'c'){ mode = S_IFCHR; }

	if( result == 0 ){ return 1; }

	if(OnlyUpdateIfNotFound){
		struct stat s;
		if( stat(result, &s) == 0 ) {
			//Already existing
			return 0;
		}
	}

	R = unlink(result);
	R = mknod(result, (S_IRUSR | S_IWUSR | mode), MKDEV(Major, Minor) );
	if(R == -1){
		MakeDir(result);
		R = mknod(result, (S_IRUSR | S_IWUSR | mode), MKDEV(Major, Minor) );
		if(R == -1){
			fprintf(stderr, "E: Failed to create special file: %s\n", result);
			return 12;
		}
	}

	R = chmod(result, S_IRUSR | S_IWUSR | S_IRGRP | S_IWGRP);
	if(R == -1){ fprintf(stderr, "E: Failed to chmod special file: %s\n", result); return 13; }

#endif
	return 0;
}

int Mknod(const char* result, char Type, int Major, int Minor){
	return MknodEx(result, Type, Major, Minor, 0);
}

int Scan(char Type, int OnlyUpdateIfNotFound){
#if defined(__linux) || defined(linux)
	DIR* DEV_DIR= 0;

	if(Type == 'b'){ DEV_DIR = opendir("/sys/dev/block"); }
	if(Type == 'c'){ DEV_DIR = opendir("/sys/dev/char"); }
	if(DEV_DIR == 0){
		fprintf(stderr, "E: Failed to open '/sys/dev/*': \n");
		return 1;
	};

	while(1){
		struct dirent* d = readdir(DEV_DIR);
		if(d == 0){break;};

		char* MM = d->d_name;
		char* Divider = strchr(MM, ':');
		if(Divider == 0){
			continue;
		}

		*Divider = 0;
		int Major = atoi(MM);
		int Minor = atoi(Divider+1);

		const char* result = DevMM2Name(Type, Major, Minor);
		int R = MknodEx(result, Type, Major, Minor, OnlyUpdateIfNotFound);
//		if( R == 0 ){ printf("I: %c: %i:%i -> %s\n", Type, Major, Minor, result); }
	}

	closedir(DEV_DIR);

#endif
	return 0;
}

int Watcher(int Interval){
#if defined(__linux) || defined(linux)
	if(Interval < 1){ Interval = 1; }

	//1st, scan and overwrite existing special files
	Scan('c', 0);
	Scan('b', 0);

	//2nd, watching and update
	while(1){
		sleep(Interval);
		Scan('c', 1);
		Scan('b', 1);
	}

#endif
	return 0;
}

int main(int argc, char** argv){

	char Type = 0;
	int MknodMode = 0;

	char *Env = getenv("DEVMM2NAME_MTDBLOCK_MAJOR");
	if(Env){
		MTDBLOCK_MAJOR = atoi(Env);
	}

	//Check 'Type' is begin with 'mk' or not.
	if(argc > 1){
		MknodMode = CheckMknodMode(argv[1]);
		if(!MknodMode){
			Type = argv[1][0];
		} else {
			Type = argv[1][2];
		}
	}

	//[Type Major Minor] style
	if(argc == 4){
		int Major = atoi(argv[2]);
		int Minor = atoi(argv[3]);

		const char* result = DevMM2Name(Type, Major, Minor);
		if(result != BLANK_STR){
			if(!MknodMode){
				printf("%s\n", result);
			} else {
				return Mknod(result, Type, Major, Minor);
			}
			return 0;
		}
		return 2;
	}

	//[Type Major:Minor] style -> Same as /sys/dev/*/
	if(argc == 3){
		if(strcmp(argv[1], "watch") == 0){
			return Watcher(atoi(argv[2]));
		}

		char* MM = argv[2];
		char* Divider = strchr(MM, ':');
		if(Divider == 0){
			ShowUsage(argv[0]);
			return 1;
		}

		*Divider = 0;
		int Major = atoi(MM);
		int Minor = atoi(Divider+1);

		const char* result = DevMM2Name(Type, Major, Minor);
		if(result != BLANK_STR){
			if(!MknodMode){
				printf("%s\n", result);
			} else {
				return Mknod(result, Type, Major, Minor);
			}
			return 0;
		}
		return 2;
	}

	//[Mode] style
	if(argc == 2){
		if(strcmp(argv[1], "scan") == 0){
			Scan('c', 0);
			Scan('b', 0);
			return 0;
		}
		if(strcmp(argv[1], "update") == 0){
			Scan('c', 1);
			Scan('b', 1);
			return 0;
		}
		if(strcmp(argv[1], "watch") == 0){
			return Watcher(10);
		}
	}

	ShowUsage(argv[0]);
	return 1;
}

