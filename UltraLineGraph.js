import React, {Component} from 'react';
import * as d3 from 'd3';
import ReactDOM from 'react-dom';
import moment from 'moment';
import './ultralinegraph.css';

/* config */
var margin = {top:20, left: 50, right: 10, bottom: 20};
var height = 400 - margin.top - margin.bottom;
var width = 600 - margin.left - margin.right;

function drawLineChart(el, config) {
    let data = config.data;

    /* init */
    var svg = d3.select(el).select('svg');
    svg.on('mousemove', mousemove)
    svg.attr('height', height + margin.top + margin.bottom);
    svg.attr('width', width + margin.left + margin.right);
    let g = svg.select('g.upco').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

    // g.on('mousemove', mousemove)

    let bisectDate = d3.bisector(d => d.date).left;
    /* define axis & line */
    var x = d3.scaleTime()
        .range([0, width])
        .domain(d3.extent(data[0].points, d => d.date));
    let getXAxis = () => d3.axisBottom(x).ticks(7);

    let maxY = 0;
    for(let d in data) {
        data[d].points.sort((a, b) => a.date - b.date);
        let numbers = data[d].points.map(p => p.value);
        maxY = Math.max(maxY, Math.max.apply(null, numbers));
    }
    let items = svg.select('defs').selectAll('linearGradient').data(data);
    items.enter().append('linearGradient')
        .merge(items)
        .attr('id', (d, i) => `lcg-${i}`)
        .attr('x1', '0%')
        .attr('y1', '0%')
        .attr('x2', '100%')
        .attr('y2', '0%')
        .each(function(d, i) {
            let items = d3.select(this).selectAll('stop').data(data[i].color)
            items.enter().append('stop')
                .merge(items)
                .attr('offset', (d, i) => i ? '100%' : '0%')
                .style('stop-color', d => d);
        });

    var y = d3.scaleLinear()
        .rangeRound([height, 0])
        .domain([0, maxY]);
    let getYAxis = () => d3.axisLeft(y).ticks(5);

    function mousemove() {
        let _x = d3.mouse(this)[0]
        _x = Math.max(0, Math.min(_x - margin.left, width))
        var x0 = x.invert(_x),
            i = bisectDate(data[0].points, x0);
        for(let fi in data) {
            // console.log(_x, i)
            var d0 = data[fi].points[i - 1],
            d1 = data[fi].points[i];
            if(d0 && d1) {
                let d = x0 - d0.date > d1.date - x0 ? d1 : d0;
                // console.log(d)
                if(d) g.selectAll('circle.cp-' + fi)
                .attr('cx', x(d.date))
                .attr('cy', y(d.value))
            }
        }
    }

    /* draw gridlines */
    let gridY = svg.select('g.grid.y');
    getYAxis().tickSize(-width).tickFormat('')(gridY);

    let gridX = svg.select('g.grid.x');
    gridX.attr("transform", "translate(0," + height + ")");
    getXAxis().tickSize(-height).tickFormat('')(gridX);
    
    /* draw axis */
    let axisX = svg.select('g.axis.x');
    axisX.attr('transform', 'translate(0, ' + height + ')');
    getXAxis()(axisX);
    
    let axisY = svg.select('g.axis.y');
    getYAxis()(axisY);

    var line = d3.line()
        .curve(d3.curveMonotoneX)
        // .curve(d3.curveCatmullRom)
        // .curve(d3.curveCardinal)
        // .curve(d3.curveBasis)
        .x(d => x(d.date))
        .y(d => y(d.value));

    /* draw path */
    // for(let i in data) {
    //     let d = data[i].points;
    //     let traceg = g.append('g')
    //         .attr('class', 'trace')
        
    //     traceg.append('path')
    //         .attr('class', 'thk')
    //         .attr('style', `stroke:url(#lcg-${i});`)
    //         .attr('filter', 'url(#f1)')
    //         .datum(d)
    //         .attr('d', line);
    //     traceg.append('circle')
    //         .attr('class', 'cp-' + i)
    //         .attr('r', 5)
    //         .attr('cx', x(d[d.length - 1].date))
    //         .attr('cy', y(d[d.length - 1].value))
    //         .attr('fill', data[i].color[0])
    //         .attr('style', 'filter:url(#f2)');
    //     traceg.append('path')
    //         .attr('style', `stroke:url(#lcg-${i});`)
    //         .datum(d)
    //         .attr('d', line);
    //     traceg.append('circle')
    //         .attr('class', 'cp-' + i)
    //         .attr('r', 3)
    //         .attr('cx', x(d[d.length - 1].date))
    //         .attr('cy', y(d[d.length - 1].value))
    //         .attr('fill', data[i].color[1])
    //         .attr('style', 'filter:url(#f2)');
    // }

    let bisectPoints = [];
    if(config.bucketBase == 'hour' || config.bucketBase == 'day') {
        let extremes = d3.extent(data[0].points, f => f.date);
        let startBase = moment(extremes[0]).startOf(config.bucketBase);
        let endBase = moment(extremes[1]).endOf(config.bucketBase);
        // bisectPoints.push(startBase.valueOf());
        // let pointer = extremes[0];
        let pointer = startBase.valueOf();
        let increment = config.bucketBase == 'hour' ? 3600000 : 86400000;
        do {
            bisectPoints.push(pointer);
        } while((pointer = pointer + increment) < extremes[1]);
        bisectPoints.push(extremes[1]);
    }
    // console.log(bisectPoints.slice(0, 3).map(f => moment(f).format('DD/MM/YYYY HH:mm')))
    // console.log(bisectPoints.slice(bisectPoints.length - 3).map(f => moment(f).format('DD/MM/YYYY HH:mm')))

    function bisectPoint(tx, backward) {
        let i = d3.bisector(d => d).left(bisectPoints, x.invert(tx), 1);
        let d0 = bisectPoints[i - 1];
        let d1 = bisectPoints[i];
        return x(backward ? d0 : d1);
    }
    svg.select('rect.ro')
    .attr('width', width)
    .attr('height', height)
    .attr('fill', 'transparent')
    .call(d3.drag()
        .on('start', function(d) {
            let coords = d3.mouse(this);
            this.dropX = coords[0];
            g.selectAll('rect.rs').remove();
            this.est = false;
            // g.append('rect')
            //     .attr('class', 'rs')
            //     .attr('width', 1)
            //     .attr('height', height)
            //     .attr('fill', 'rgba(0,0,0,.1)')
            //     .attr('x', coords[0]);
        })
        .on('drag', function(d) {
            let coords = d3.mouse(this);
            let tarX = coords[0];
            let rect = g.selectAll('rect.rs').data([0]);
            if(!this.est && Math.abs(tarX - this.dropX) > 3) {
                rect.enter().append('rect')
                    .attr('class', 'rs')
                    .attr('fill', 'rgba(0,0,0,.1')
                    .attr('height', height)
                    .on('click', function() {
                        this.remove()
                    });
                if(config.bucketSize) {
                    let time = x.invert(tarX);
                    let base = moment(time);
                    if(config.bucketBase == 'hour') base = base[tarX > this.dropX ? 'startOf' : 'endOf']('hour');
                    if(config.bucketBase == 'day') base = base.startOf('day');
                    this.dropX = x(base.valueOf());
                }
                this.est = true;
            }
            tarX = bisectPoint(tarX, this.dropX > tarX);
            if(tarX < this.dropX) rect.attr('x', tarX);
            else rect.attr('x', this.dropX);
            rect.attr('width',  Math.abs(this.dropX - tarX));
        })
        .on('end', function(d) {
            if(!this.est) return;
            let x1 = this.dropX;
            let x2 = d3.mouse(this)[0];
            x2 = bisectPoint(x2);
            let points = [x1, x2];
            if(x1 > x2) points.reverse();
            points = points.map(p => x.invert(p));
            if(config.onZoom) config.onZoom(points[0], points[1]);
        })
    );
}


export default class UltraLineGraph extends Component {
    constructor() {
        super();
        this.line = d3.line()
            .curve(d3.curveMonotoneX)
            // .curve(d3.curveCatmullRom)
            // .curve(d3.curveCardinal)
            // .curve(d3.curveBasis)
            .x(d => this.x(d.date))
            .y(d => this.y(d.value));
    }
    componentWillMount() {
        this.setXY(this.props);
    }
    componentDidMount() {
        let config = this.props.config;
        drawLineChart(ReactDOM.findDOMNode(this), config);
    }
    componentWillReceiveProps(props) {
        if(props.config != this.props.config) {
            this.setXY(props);
            drawLineChart(ReactDOM.findDOMNode(this), props.config);
        }
    }
    setXY(props) {
        let data = props.config.data;
        this.x = d3.scaleTime()
            .range([0, width])
            .domain(d3.extent(data[0].points, d => d.date));

        let maxY = 0;
        for(let d in data) {
            data[d].points.sort((a, b) => a.date - b.date);
            let numbers = data[d].points.map(p => p.value);
            maxY = Math.max(maxY, Math.max.apply(null, numbers));
        }
        this.y = d3.scaleLinear()
            .rangeRound([height, 0])
            .domain([0, maxY]);
    }
    render() {
        let config = this.props.config;
        let data = this.props.config.data;
        return (
            <div className="ulg">
                <svg>
                    <defs>
                        <filter id="f1" x="0" y="0">
                            <feGaussianBlur in="SourceGraphic" stdDeviation="5"></feGaussianBlur>
                        </filter>
                        <filter id="f2" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur in="SourceGraphic" stdDeviation="1"></feGaussianBlur>
                        </filter>
                        <linearGradient>
                            <stop></stop>
                        </linearGradient>
                    </defs>
                    <g transform={`translate(${margin.left}, ${margin.top})`}>
                        <g className="y grid"></g>
                        <g className="x grid"></g>
                        <g className="y axis"></g>
                        <g className="x axis"></g>
                        <text className="ult" x={width / 2} height={10}>{config.name}</text>
                    </g>
                    <g transform={`translate(${margin.left}, ${margin.top})`}>
                        {data.map((d, i) => {
                            let pathStyle = {stroke:`url(#lcg-${i})`};
                            let paths = [
                                <path key={d.name + 'blur'} className="thk" style={pathStyle} filter="url(#f1)" d={this.line(d.points)}></path>,
                                <path key={d.name} style={pathStyle} d={this.line(d.points)}></path>
                            ];
                            return <g key={i} className="trace">{paths}</g>
                        })}
                    </g>
                    <g transform={`translate(${margin.left}, ${margin.top})`}>
                        <rect className="ro"></rect>
                    </g>
                    <g className="upco"></g>
                </svg>
            </div>
        )
    }
}