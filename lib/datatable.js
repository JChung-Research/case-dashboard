// var _table - defined in globals.js

/// helper functions for deep path like .size.x etc.

function setValue(obj, path, value) {
    var a = path.split('.')
    var o = obj
    while (a.length - 1) {
      var n = a.shift()
      if (!(n in o)) o[n] = {}
      o = o[n]
    }
    o[a[0]] = value
  }
  
  function getValue(obj, path) {
    path = path.replace(/\[(\w+)\]/g, '.$1')
    path = path.replace(/^\./, '')
    var a = path.split('.')
    var o = obj
    while (a.length) {
      var n = a.shift()
      if (!(n in o)) return
      o = o[n]
    }
    return o
  }


//////////////////////////////////      DataTable class         //////////////

class DataTable {

    constructor(divID, _elementList, atablespec) {
        this.list = _elementList;
        this.divid = divID;
        this.tableSpec = atablespec;
    };

    refresh() {
        var myDiv = document.getElementById(this.divid);
        var atext = "";
        atext += "<table class='TableStyle' >";
        atext += "<tr>";
        for (var j = 0; j < this.tableSpec.length; j++) {
            atext += "<td><h4 id='generatedEleTitle'>";
            atext += this.tableSpec[j].path;
            atext += "</h4></td>";
        }
        atext += "</tr>";


        for (var i = 0; i < _elementList.length; i++) {
            var anElement = _elementList[i];
            atext += "<tr style='margin-bottom:10px'>";

            for (var j = 0; j < _tableSpec.length; j++) {
                var aspec = _tableSpec[j];
                atext += "<td>";
                //atext += aspec.type;
                atext += '<input type="' + aspec.type + '" class="TableElementsStyle" ';
                atext += 'id="' + aspec.path + '%' + i + '" ';
                if (aspec.params) atext += aspec.params;
                var avalue = getValue(anElement, aspec.path);
                atext += 'value="' + avalue + '" ';
                atext += 'onChange="onTDInputChange(' + "'" + this.divid + "',";
                atext += "'" + aspec.path + '%' + i + "'"
                atext += ')"'
                atext += "></td>";
            }
            atext += '<td><button type="button" onclick="onDeleteObject(this.name)" name="' + i + '" style="margin-bottom:15px" > <img style="height:15px; margin-bottom:5px" src="media/delete.png"> </td>';
            atext += "</tr>";
        }
        atext += "</table>";
        myDiv.innerHTML = atext;
        //console.log(atext);
    }

    deleteObject(anIndex) {
        var newArray = [];
        for (i = 0; i < _elementList.length; i++) {
            if (i != anIndex) newArray.push(_elementList[i]);
        }
        _elementList = newArray;
        this.refresh();
        _real.refresh();
        _graph.refresh();
    }
}   // end table class


/////////////////////////////// callback functions     /////////////////////////////



function onDeleteObject(anindex) {
    _table.deleteObject(anindex);
}


function onTDInputChange(atable, astring) {
    //window.alert("hi");
    var res = astring.split("%");
    var anElement = _elementList[res[1]];
    var anhtml = document.getElementById(astring);
    // var pathlist = res[0].split(".");
    // var curitem = anElement[pathlist[0]]
    // for (var i = 1; i < pathlist.length; i++) {curitem = curitem[res[i]]};
    // curitem = anhtml.value;
    //anElement[res[0]] = anhtml.value;
    setValue(anElement, res[0], anhtml.value);

    _table.refresh();
    _real.refresh();
    _graph.refresh();

}