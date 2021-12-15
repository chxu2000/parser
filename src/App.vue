<template>
  <div id="app">
    <el-row>
      <div id="reader">
        <el-header>
          <h1>源程序字符串</h1>
        </el-header>
        <el-main id="main">
          <el-input
            type="textarea"
            rows="15"
            resize="none"
            placeholder="请选择源程序文件或直接输入源程序"
            v-model="sourceCode"
          >
          </el-input>
        </el-main>
        <el-footer>
          <el-row>
            <el-col :span="18">
              <el-input
                placeholder="请选择源程序文件"
                v-model="filePath"
                :disabled="true"
              >
              </el-input>
            </el-col>
            <el-col :span="6">
              <el-button @click="getSourceCode">打开文件</el-button>
            </el-col>
          </el-row>
        </el-footer>
      </div>
      <div id="result">
        <el-header>
          <h1>处理结果</h1>
        </el-header>
        <el-main id="main">
          <el-row>
            <el-input
              type="textarea"
              rows="15"
              resize="none"
              placeholder="请选择要进行的操作"
              :readonly="true"
              v-model="resultString"
              style=""
            >
            </el-input>
          </el-row>
          <el-row>
            <div style="margin-top: 16px">
              <el-radio v-model="resultRadio" label="1">预处理结果</el-radio>
              <el-radio v-model="resultRadio" label="2" :disabled="stat != 2"
                >词法分析结果</el-radio
              >
              <el-radio
                v-model="resultRadio"
                label="3"
                :disabled="grammarResult.length == 0"
                >语法分析结果</el-radio
              >
            </div>
          </el-row>
        </el-main>
        <el-footer>
          <el-row>
            <el-col :span="4">
              <el-button @click="preProcess" :disabled="false"
                >预处理</el-button
              >
            </el-col>
            <!-- <el-col :span="12"><div class="deselect">&nbsp;</div></el-col> -->
            <el-col :span="5">
              <el-button @click="lexicalAnalysisTop" :disabled="stat == 0"
                >词法分析</el-button
              >
            </el-col>
            <el-col :span="5">
              <el-button @click="readInGrammar" :disabled="false"
                >读入文法规则</el-button
              >
            </el-col>
            <el-col :span="5">
              <el-button
                @click="grammaticalAnnalysis"
                :disabled="!grammatical_annalysis_stat"
                >语法分析</el-button
              >
            </el-col>
            <!-- :disabled="!draw_grammar_tree_stat" -->
            <el-col :span="5">
              <el-button
                @click="drawGrammarTree"
                :disabled="!draw_grammar_tree_stat"
                >绘制语法树</el-button
              >
            </el-col>
          </el-row>
        </el-footer>
      </div>
    </el-row>
    <el-row v-show="resultRadio == '2'">
      <el-col :span="12">
        <h2>符号表</h2>
        <el-table height="350" :data="idList" style="width: 100%">
          <el-table-column prop="index" label="序号" align="center" sortable>
          </el-table-column>
          <el-table-column prop="value" label="标识符" align="center" sortable>
          </el-table-column>
        </el-table>
      </el-col>
      <el-col :span="12">
        <h2>常量表</h2>
        <el-table height="350" :data="constList" style="width: 100%">
          <el-table-column prop="type" label="类型" align="center" sortable>
          </el-table-column>
          <el-table-column prop="index" label="序号" align="center" sortable>
          </el-table-column>
          <el-table-column prop="value" label="值" align="center" sortable>
          </el-table-column>
        </el-table>
      </el-col>
    </el-row>
    <el-row v-show="resultRadio == '3' || resultRadio == '4'">
      <el-row>
        <el-col :span="24" v-show="tableRadio == '1'">
          <h2>LR(1)分析表</h2>
          <el-table height="350" :data="actionGotoContent" style="width: 100%">
            <el-table-column
              v-for="col in actionGotoTitle"
              :prop="col"
              :label="col"
              :key="col"
              align="center"
            >
            </el-table-column>
          </el-table>
        </el-col>
        <el-col :span="24" v-show="tableRadio == '2'">
          <h2>LR(1)分析过程</h2>
          <el-table
            height="350"
            :data="grammarAnalysisProc"
            style="width: 100%"
          >
            <el-table-column
              v-for="col in grammarAnalysisTitle"
              :prop="col"
              :label="col"
              :key="col"
              align="center"
            >
            </el-table-column>
          </el-table>
        </el-col>
      </el-row>
      <el-row>
        <div style="margin-top: 16px">
          <el-radio v-model="tableRadio" label="1" :disabled="grammar_stat == 0"
            >LR(1)分析表</el-radio
          >
          <el-radio v-model="tableRadio" label="2" :disabled="grammar_stat != 2"
            >LR(1)分析过程</el-radio
          >
        </div>
      </el-row>
    </el-row>
    <el-drawer :visible.sync="treeDrawer" direction="rtl" size="85%">
      <el-row>
        <h1>语法树</h1>
      </el-row>
      <el-row style="height: 90%">
        <div id="grammarTree" ref="grammarTree"></div>
      </el-row>
    </el-drawer>
  </div>
</template>

<script>
import { ipcRenderer } from "electron";
import { err_string } from "./grammatical_annalysis/grammar";
import {
  LR1,
  err_string_2,
} from "./grammatical_annalysis/grammatical_analysis";
// import func from "vue-editor-bridge";
const { dialog } = require("electron").remote;
const path = require("path");
// const textDecoderGBK = new TextDecoder("GBK");
const textDecoderUTF8 = new TextDecoder("UTF8");

function deepCopy(obj) {
  var copy = Object.create(Object.getPrototypeOf(obj));
  var propNames = Object.getOwnPropertyNames(obj);

  propNames.forEach(function (name) {
    var desc = Object.getOwnPropertyDescriptor(obj, name);
    Object.defineProperty(copy, name, desc);
  });

  return copy;
}

export default {
  name: "App",
  components: {},
  data() {
    return {
      sourceCode: "",
      preProcessResult: "",
      lexicalAnalysisResult: "",
      lexicalAnalysisArray: [],
      grammarResult: "",
      actionGotoTitle: [],
      actionGotoContent: [],
      grammarAnalysisTitle: ["STEP", "STATUS", "SYMBOL", "INPUT", "PRODUCTION"],
      grammarAnalysisProc: [],
      filePath: "",
      stat: 0, // 词法分析状态
      grammar_stat: 0, // 语法分析状态
      pointer: 0,
      ch: " ",
      strToken: "",
      finishFlag: false,
      errFlag: false,
      lexError: false,
      treeDrawer: false,
      resultRadio: "1",
      tableRadio: "1",
      // 关键字表
      reserve: [
        "alignas",
        "alignof",
        "and",
        "and_eq",
        "asm",
        "atomic_cancel",
        "atomic_commit",
        "atomic_noexcept",
        "auto",
        "bitand",
        "bitor",
        "bool",
        "break",
        "case",
        "catch",
        "char",
        "char8_t",
        "char16_t",
        "char32_t",
        "class",
        "compl",
        "concept",
        "const",
        "consteval",
        "constexpr",
        "constinit",
        "const_cast",
        "continue",
        "co_await",
        "co_return",
        "co_yield",
        "decltype",
        "default",
        "delete",
        "do",
        "double",
        "dynamic_cast",
        "else",
        "enum",
        "explicit",
        "export",
        "extern",
        "false",
        "float",
        "for",
        "friend",
        "goto",
        "if",
        "inline",
        "int",
        "long",
        "mutable",
        "namespace",
        "new",
        "noexcept",
        "not",
        "not_eq",
        "nullptr",
        "operator",
        "or",
        "or_eq",
        "private",
        "protected",
        "public",
        "reflexpr",
        "register",
        "reinterpret_cast",
        "requires",
        "return",
        "short",
        "signed",
        "sizeof",
        "static",
        "static_assert",
        "static_cast",
        "string",
        "struct",
        "switch",
        "synchronized",
        "template",
        "this",
        "thread_local",
        "throw",
        "true",
        "try",
        "typedef",
        "typeid",
        "typename",
        "union",
        "unsigned",
        "using",
        "virtual",
        "void",
        "volatile",
        "wchar_t",
        "while",
        "xor",
        "xor_eq",
      ],
      // 符号表（运算符、界符）
      singleSymbol: [";", "(", ")", "{", "}", "[", "]", ",", ".", "~"],
      doublenESymbol: ["=", "+", "-", "&", "|"],
      EqualSymbol: ["*", "/", "%", "!", "^"],
      idList: [],
      constList: [],
      constIntList: [],
      constFloatList: [],
      constCharList: [],
      constStringList: [],
      lr1: new LR1(""),
    };
  },
  computed: {
    grammatical_annalysis_stat() {
      return this.stat == 2 && this.grammar_stat == 1 && !this.lexError;
    },
    draw_grammar_tree_stat() {
      return this.stat == 2 && this.grammar_stat == 2 && !this.lexError;
    },
    resultString() {
      if (this.resultRadio == "1") {
        return this.preProcessResult;
      } else if (this.resultRadio == "2") {
        return this.lexicalAnalysisResult;
      } else if (this.resultRadio == "3") {
        return this.grammarResult;
      } else {
        return "";
      }
    },
  },
  methods: {
    // 获取源代码
    getSourceCode() {
      dialog
        .showOpenDialog({
          title: "请选择源代码文件",
          filters: [
            {
              name: "Source Files",
              extensions: ["c", "cpp"],
            },
            {
              name: "Header Files",
              extensions: ["h"],
            },
            {
              name: "All Files",
              extensions: ["*"],
            },
          ],
        })
        .then((result) => {
          if (result.filePaths.length == 0) return;
          this.filePath = result.filePaths[0];
          ipcRenderer.send("read-file", this.filePath);
        });
    },
    // 预处理
    preProcess() {
      this.idList.splice(0, this.idList.length);
      this.constList.splice(0, this.constList.length);
      this.constIntList.splice(0, this.constIntList.length);
      this.constFloatList.splice(0, this.constFloatList.length);
      this.constCharList.splice(0, this.constCharList.length);
      this.constStringList.splice(0, this.constStringList.length);
      let i,
        j,
        k,
        msg,
        itemList = [],
        lineList = this.sourceCode.split(/\r\n|\n/),
        includeFilePath = "",
        includeLines = [],
        defineList = [],
        inString = false,
        inAnnotation = false,
        annotationStartPos = 0;
      for (i = 0; i < lineList.length; i++) {
        // 去除前后空白符
        lineList[i] = lineList[i].trim();

        if (!inAnnotation && !inString) {
          // 处理#include
          if (lineList[i].slice(0, 8) == "#include") {
            let firstQuotPos = lineList[i].indexOf('"'),
              lastQuotPos = lineList[i].lastIndexOf('"');
            if (firstQuotPos != -1 && firstQuotPos != lastQuotPos) {
              includeFilePath = path.join(
                path.dirname(this.filePath),
                lineList[i].slice(firstQuotPos + 1, lastQuotPos)
              );
            } else {
              lineList.splice(i, 1);
              i--;
              this.$message({
                showClose: true,
                message: "Warning: 暂不支持除相对路径外的引用形式",
                type: "warning",
              });
              continue;
            }
            msg = ipcRenderer.sendSync("read-include-file", includeFilePath);
            if (msg.errFlag) {
              lineList.splice(i, 1);
              i--;
              this.$message({
                showClose: true,
                message: "Warning: 无法打开被引用文件，请检查相对路径的正确性",
                type: "warning",
              });
              continue;
            }
            includeLines = textDecoderUTF8.decode(msg.content).split("\r\n");
            lineList.splice(i, 1, ...includeLines);
            // console.log(lineList);
            i--;
            continue;
          }

          // 处理#define
          if (lineList[i].slice(0, 7) == "#define") {
            itemList = lineList[i].split(/\s/);
            if (itemList.length >= 3)
              defineList.push({ before: itemList[1], after: itemList[2] });
            lineList.splice(i, 1);
            i--;
            continue;
          }
        }

        for (j = 0; j < lineList[i].length; j++) {
          // 注释
          if (lineList[i][j] == "/") {
            // 行内注释
            if (j != lineList[i].length - 1 && lineList[i][j + 1] == "/")
              lineList[i] = lineList[i].slice(0, j);
            // 跨行注释
            else if (j != lineList[i].length - 1 && lineList[i][j + 1] == "*") {
              inAnnotation = true;
              annotationStartPos = j;
              j++;
            } else if (inAnnotation && j != 0 && lineList[i][j - 1] == "*") {
              inAnnotation = false;
              lineList[i] =
                lineList[i].slice(0, annotationStartPos) +
                lineList[i].slice(j + 1);
              j = annotationStartPos;
            }
          } else if (!inAnnotation && lineList[i][j] == '"') {
            inString = !inString;
          }
          // 空白符
          else if (!inString && !inAnnotation && /\s/.test(lineList[i][j])) {
            for (
              k = j + 1;
              k < lineList[i].length && /\s/.test(lineList[i][k]);
              k++
            );
            lineList[i] = lineList[i].slice(0, j) + " " + lineList[i].slice(k);
          }
          // 位于跨行注释中
          if (inAnnotation && j >= lineList[i].length - 1) {
            lineList[i] = lineList[i].slice(0, annotationStartPos);
            annotationStartPos = 0;
          }
        }
        // 去除前后空白符
        lineList[i] = lineList[i].trim();
        // 删除空行
        if (lineList[i].length == 0) {
          lineList.splice(i, 1);
          i--;
        } else {
          let p = lineList[i].length,
            tmpInString,
            lastIndex;
          for (j = 0; j < defineList.length; j++) {
            tmpInString = inString;
            lastIndex = lineList[i]
              .slice(0, p)
              .lastIndexOf(defineList[j].before);
            while (lastIndex != -1) {
              for (
                k = p - 1;
                k >= lastIndex + defineList[j].before.length;
                k--
              ) {
                if (lineList[i][k] == '"') {
                  tmpInString = !tmpInString;
                }
              }
              console.log("lastIndex: ", lastIndex);
              console.log("tmpInString: ", tmpInString);
              if (!tmpInString) {
                lineList[i] =
                  lineList[i].slice(0, lastIndex) +
                  defineList[j].after +
                  lineList[i].slice(lastIndex + defineList[j].before.length);
              }
              p = lastIndex;
              lastIndex = lineList[i]
                .slice(0, p)
                .lastIndexOf(defineList[j].before);
            }
          }
        }
      }
      this.preProcessResult = "";
      for (i = 0; i < lineList.length; i++) {
        this.preProcessResult += lineList[i] + "\r\n";
      }
      this.stat = 1;
      this.grammar_stat = this.grammar_stat >= 1 ? 1 : 0;
      this.resultRadio = "1";
      this.tableRadio = "1";
      this.$message({
        showClose: true,
        message: "预处理完成",
        type: "success",
      });
    },
    // 判断ch中的字符是否为字母
    IsLetter() {
      return /[a-zA-Z_]/.test(this.ch);
    },
    // 判断ch中的字符是否为数字
    IsDigit() {
      return /\d/.test(this.ch);
    },
    // 将下一字符读到ch中，搜索指示器前移一字符位置
    GetChar() {
      if (this.pointer >= this.preProcessResult.length) {
        this.finishFlag = true;
        this.ch = " ";
        return;
      }
      this.ch = this.preProcessResult[this.pointer];
      this.pointer++;
    },
    // 检查ch中的字符是否为空白。若是，则调用GetChar直至ch中进入一个非空白字符
    GetBC() {
      while ((!this.finishFlag && this.ch == " ") || this.ch == "\t") {
        this.GetChar();
      }
    },
    // 将ch中的字符连接到strToken之后
    Concat() {
      this.strToken += this.ch;
    },
    //
    Retract() {
      this.pointer--;
    },
    // 对strToken中的字符串查找保留字表，若它是一个保留字则返回它的编码，否则返回-1
    Reserve() {
      for (let i = 0; i < this.reserve.length; i++) {
        if (this.reserve[i] == this.strToken) return i;
      }
      return -1;
    },
    // 将strToken中的标识符插入符号表，返回符号表指针
    InsertId() {
      let i;
      for (i = 0; i < this.idList.length; i++) {
        if (this.idList[i].value == this.strToken) return i + 1;
      }
      this.idList.push({ index: i + 1, value: this.strToken });
      return i + 1;
    },
    // 将strToken中的常数插入常数表，返回常数表指针
    InsertConst(type) {
      let i, tempList;
      if (type == "Int") tempList = this.constIntList;
      else if (type == "Float") tempList = this.constFloatList;
      else if (type == "Char") tempList = this.constCharList;
      else if (type == "String") tempList = this.constStringList;
      else return;
      for (i = 0; i < tempList.length; i++) {
        if (tempList[i].value == this.strToken) return i + 1;
      }
      tempList.push({
        index: i + 1,
        value: this.strToken,
      });
      this.constList.push({
        index: i + 1,
        type: type,
        value: this.strToken,
      });
      return i + 1;
    },
    // 错误处理
    ProcError(word) {
      if (!this.errFlag) {
        this.lexicalAnalysisResult += "<此处出现词法错误>";
        this.$message({
          showClose: true,
          message:
            "词法分析过程中在（第" +
            word.row +
            "行，第" +
            word.col +
            "列）发现错误",
          type: "error",
        });
      }
      this.errFlag = true;
      this.lexError = true;
      this.stat = 0;
      if (this.pointer >= this.preProcessResult.length) {
        this.finishFlag = true;
      }
      return;
    },
    // 词法分析程序
    lexicalAnalysis(word) {
      let code, value;
      this.strToken = ""; // 置strToken为空串
      this.GetChar();
      this.GetBC();
      ++word.col;
      if (this.finishFlag) return 0;
      word.prop = "-";
      if (this.IsLetter()) {
        this.errFlag = false;
        while (!this.finishFlag && (this.IsLetter() || this.IsDigit())) {
          this.Concat();
          this.GetChar();
        }
        this.Retract();
        code = this.Reserve();
        if (code == -1) {
          value = this.InsertId(this.strToken);
          word.type = "<ID>";
          word.prop = value;
        } else {
          word.type = this.reserve[code];
        }
      } else if (this.IsDigit()) {
        this.errFlag = false;
        while (!this.finishFlag && this.IsDigit()) {
          this.Concat();
          this.GetChar();
        }
        if (this.ch == ".") {
          this.Concat();
          this.GetChar();
          if (this.IsDigit()) {
            while (!this.finishFlag && this.IsDigit()) {
              this.Concat();
              this.GetChar();
            }
            this.Retract();
            value = this.InsertConst("Float");
          } else {
            this.Retract();
            value = this.InsertConst("Float");
          }
          word.type = "FLOAT";
        } else {
          this.Retract();
          value = this.InsertConst("Int");
          word.type = "<INT>";
        }
        word.prop = value;
      } else if (this.singleSymbol.indexOf(this.ch) != -1) {
        this.errFlag = false;
        word.type = this.ch;
      } else if (this.doublenESymbol.indexOf(this.ch) != -1) {
        this.errFlag = false;
        this.Concat();
        this.GetChar();
        if (this.ch == "=" || this.ch == this.strToken[0]) {
          this.Concat();
        } else {
          this.Retract();
        }
        word.type = this.strToken;
      } else if (this.EqualSymbol.indexOf(this.ch) != -1) {
        this.errFlag = false;
        this.Concat();
        this.GetChar();
        if (this.ch == "=") {
          this.Concat();
        } else {
          this.Retract();
        }
        word.type = this.strToken;
      } else if (this.ch == ">" || this.ch == "<") {
        this.errFlag = false;
        this.Concat();
        this.GetChar();
        if (this.ch == "=") {
          this.Concat();
        } else if (this.ch == this.strToken[0]) {
          this.Concat();
          this.GetChar();
          if (this.ch == "=") {
            this.Concat();
          } else {
            this.Retract();
          }
        } else {
          this.Retract();
        }
        word.type = this.strToken;
      } else if (this.ch == '"' || this.ch == "'") {
        this.errFlag = false;
        this.Concat();
        this.GetChar();
        while (!this.finishFlag && this.ch != this.strToken[0]) {
          this.Concat();
          this.GetChar();
        }
        this.Concat();
        if (this.strToken[0] == '"') {
          value = this.InsertConst("String");
          word.type = "<STRING>";
        } else if (this.strToken[0] == "'") {
          value = this.InsertConst("Char");
          word.type = "<CHAR>";
        }
        word.prop = value;
      } else if (this.ch == ":") {
        this.errFlag = false;
        this.Concat();
        this.GetChar();
        if (this.ch == this.strToken[0]) {
          this.Concat();
        } else {
          this.Retract();
        }
        word.type = this.strToken;
      } else if (this.ch == "\n" || this.ch == "\r") {
        ++word.row;
        word.col = 0;
        this.errFlag = false;
        this.GetChar();
        while (!this.finishFlag && (this.ch == "\n" || this.ch == "\r")) {
          this.GetChar();
        }
        this.Retract();
        return 2;
      } else {
        this.ProcError(word);
      }
      if (this.finishFlag) {
        return 0;
      } else {
        return 1;
      }
    },
    // 词法分析顶层程序
    lexicalAnalysisTop() {
      // 清空分析结果
      this.lexicalAnalysisResult = "";
      this.lexicalAnalysisArray.splice(0, this.lexicalAnalysisArray.length);
      this.finishFlag = false;
      this.pointer = 0;
      this.lexError = false;
      let temp,
        word = { type: "", prop: "", row: 1, col: 0 };
      while (!this.finishFlag) {
        temp = this.lexicalAnalysis(word);
        if (this.finishFlag) {
          break;
        } else if (temp == 1 && !this.errFlag) {
          this.lexicalAnalysisArray.push(deepCopy(word));
          this.lexicalAnalysisResult +=
            "<$" + word.type + ", " + word.prop + "> ";
        } else if (temp == 2) {
          this.lexicalAnalysisResult += "\n";
        }
      }
      this.stat = 2;
      this.resultRadio = "2";
      this.tableRadio = "1";
      if (!this.lexError) {
        this.$message({
          showClose: true,
          message: "词法分析完成",
          type: "success",
        });
      }
    },
    // 读入语法文件
    readInGrammar() {
      dialog
        .showOpenDialog({
          title: "请选择文法规则文件",
          filters: [
            {
              name: "Text Files",
              extensions: ["txt"],
            },
            {
              name: "All Files",
              extensions: ["*"],
            },
          ],
        })
        .then((result) => {
          console.log(result);
          if (result.filePaths.length == 0) return;
          ipcRenderer.send("read-grammar", result.filePaths[0]);
        });
    },
    // 语法分析程序
    grammaticalAnnalysis() {
      try {
        let parse_array = this.lr1.parser(
          this.lexicalAnalysisArray,
          this.idList,
          this.constList
        );
        this.grammar_stat = 2;
        this.resultRadio = "3";
        this.tableRadio = "2";
        this.grammarAnalysisProc = [];
        for (let i = 0; i < parse_array.length; ++i) {
          let item = {};
          for (let j = 0; j < this.grammarAnalysisTitle.length; ++j) {
            item[this.grammarAnalysisTitle[j]] = parse_array[i][j];
          }
          this.grammarAnalysisProc.push(item);
        }
        this.$message({
          showClose: true,
          message: "语法分析完成",
          type: "success",
        });
      } catch (error) {
        this.$message({
          showClose: true,
          message: "Error: " + err_string_2,
          type: "error",
        });
      }
    },
    // 初始化语法树
    initChart() {
      let initOption;
      if (this.chartInstance == undefined) {
        this.chartInstance = this.$echarts.init(this.$refs.grammarTree, {
          renderer: "svg",
        });
        window.onresize = () => {
          this.chartInstance.resize();
        };
        initOption = {
          tooltip: {
            trigger: "item",
            triggerOn: "mousemove",
          },
          toolbox: {
            saveAsImage: {}, // 导出图片
            restore: {}, // 重置
            dataZoom: {}, // 区域缩放
          },
          series: [
            {
              type: "tree",
              data: [this.lr1.node_list[this.lr1.node_list.length - 1]],
              orient: "vertical",
              expandAndCollapse: true,
              label: {
                position: "left",
                fontSize: 15,
              },
              itemStyle: {
                borderColor: "#409EFF",
              },
              leaves: {
                itemStyle: {
                  borderColor: "#F56C6C",
                },
                label: {
                  position: "bottom",
                  fontSize: 15,
                },
              },
            },
          ],
        };
      } else {
        initOption = {
          series: [
            {
              data: [this.lr1.node_list[this.lr1.node_list.length - 1]],
            },
          ],
        };
      }
      this.chartInstance.setOption(initOption);
    },
    // 绘制语法树
    drawGrammarTree() {
      this.treeDrawer = true;
      this.$nextTick(() => {
        this.initChart();
      });
    },
  },
  mounted() {
    // this.treeDrawer = false;
    ipcRenderer.on("file-content", (e, msg) => {
      if (msg.errFlag) {
        this.$message({
          showClose: true,
          message: msg.content,
          type: "error",
        });
      }
      this.stat = 0;
      this.resultRadio = "1";
      this.sourceCode = textDecoderUTF8.decode(msg.content);
    });
    ipcRenderer.on("grammar-content", (e, msg) => {
      if (msg.errFlag) {
        this.$message({
          showClose: true,
          message: msg.content,
          type: "error",
        });
      } else {
        try {
          this.grammarResult = textDecoderUTF8.decode(msg.content);
          this.lr1 = new LR1(this.grammarResult);
          this.resultRadio = "3";
          this.tableRadio = "1";
          this.grammar_stat = 1;
          console.log("test");
          this.$message({
            showClose: true,
            message: "文法规则读入完成",
            type: "success",
          });
          let actionGotoTable = this.lr1.generateTableArray();
          this.actionGotoTitle = actionGotoTable[0];
          this.actionGotoContent = [];
          for (let i = 1; i < actionGotoTable.length; ++i) {
            let item = {};
            for (let j = 0; j < this.actionGotoTitle.length; ++j) {
              item[this.actionGotoTitle[j]] = actionGotoTable[i][j];
            }
            this.actionGotoContent.push(item);
          }
        } catch (error) {
          this.grammar_stat = 0;
          console.log(err_string);
          this.$message({
            showClose: true,
            message: "Error: " + err_string,
            type: "error",
          });
        }
      }
    });
  },
  watch: {
    sourceCode() {
      this.stat = 0;
      this.grammar_stat = this.grammar_stat >= 1 ? 1 : 0;
      if (this.resultRadio == "2") this.resultRadio = "1";
    },
  },
};
</script>

<style>
#app {
  font-family: "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB",
    "Microsoft YaHei", "微软雅黑", Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  height: 100%;
  width: 100%;
}
#reader {
  height: 100%;
  width: 50%;
  float: left;
}
#result {
  height: 100%;
  width: 50%;
  float: left;
}
.deselect {
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
}
#grammarTree {
  margin: 10px;
  height: 100%;
  width: 98%;
}
</style>
