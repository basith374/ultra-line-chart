import React, {Component} from 'react';
import * as d3 from 'd3';
import ReactDOM from 'react-dom';
import moment from 'moment';
import './ultralinegraph.css';

function drawLineChart(el, data) {
    /* config */
    var margin = {top:10, left: 40, right: 10, bottom: 20};
    var height = 400 - margin.top - margin.bottom;
    var width = 600 - margin.left - margin.right;

    /* init */
    var svg = d3.select(el).select('svg');
    svg.on('mousemove', mousemove)
    svg.attr('height', height + margin.top + margin.bottom);
    svg.attr('width', width + margin.left + margin.right);
    let g = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
    // g.on('mousemove', mousemove)

    let bisectDate = d3.bisector(d => d.date).left;
    /* define axis & line */
    var x = d3.scaleTime()
        .range([0, width])
        .domain(d3.extent(data[0].points, d => d.date));
    let getXAxis = () => d3.axisBottom(x).ticks(7);

    let maxY = 0;
    for(let d in data) {
        data[d].points.sort((a, b) => a.date - b.date)
        let numbers = data[d].points.map(p => p.value);
        maxY = Math.max(maxY, Math.max.apply(null, numbers));
        let grad = svg.select('defs').append('linearGradient')
            .attr('id', `lcg-${d}`)
            .attr('x1', '0%')
            .attr('y1', '0%')
            .attr('x2', '100%')
            .attr('y2', '0%');
        grad.append('stop')
            .attr('offset', '0%')
            .style('stop-color', data[d].color[0]);
        grad.append('stop')
            .attr('offset', '100%')
            .style('stop-color', data[d].color[1]);
    }
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
                let interpolate = d3.interpolateNumber(d0.value, d1.value);
                let range = d1.date - d0.date;
                // console.log(d)
                if(d) g.selectAll('circle.cp-' + fi)
                // .attr('cx', x(d.date))
                .attr('cx', _x)
                // .attr('cy', y(d.value))
                .attr('cy', y(interpolate((x0 - d0.date) / range)))
            }
        }
    }

    var line = d3.line()
        // .curve(d3.curveMonotoneX)
        // .curve(d3.curveCatmullRom)
        // .curve(d3.curveCardinal)
        // .curve(d3.curveBasis)
        .x(d => x(d.date))
        .y(d => y(d.value));

    /* draw gridlines */
    g.append('g')
        .attr('class', 'grid')
        .call(getYAxis().tickSize(-width).tickFormat(''));
    g.append('g')
        .attr('class', 'grid')
        .attr("transform", "translate(0," + height + ")")
        .call(getXAxis().tickSize(-height).tickFormat(''));
    /* draw axis */
    g.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(0, ' + height + ')')
        .call(getXAxis());
    
    g.append('g')
        .attr('class', 'y axis')
        .call(getYAxis());

    /* draw path */
    for(let i in data) {
        let d = data[i].points;
        let traceg = g.append('g')
            .attr('class', 'trace')
        
        traceg.append('path')
            .attr('class', 'thk')
            .attr('style', `stroke:url(#lcg-${i});`)
            .attr('filter', 'url(#f1)')
            .datum(d)
            .attr('d', line);
        traceg.append('circle')
            .attr('class', 'cp-' + i)
            .attr('r', 5)
            .attr('cx', x(d[d.length - 1].date))
            .attr('cy', y(d[d.length - 1].value))
            .attr('fill', data[i].color[0])
            .attr('style', 'filter:url(#f2)');
        traceg.append('path')
            .attr('style', `stroke:url(#lcg-${i});`)
            .datum(d)
            .attr('d', line);
        traceg.append('circle')
            .attr('class', 'cp-' + i)
            .attr('r', 3)
            .attr('cx', x(d[d.length - 1].date))
            .attr('cy', y(d[d.length - 1].value))
            .attr('fill', data[i].color[1])
            .attr('style', 'filter:url(#f2)');
    }

    g.append('rect')
    .attr('width', width)
    .attr('height', height)
    .attr('fill', 'transparent')
    .call(d3.drag()
        .on('start', function(d) {
            let coords = d3.mouse(this);
            this.dropX = coords[0]
            g.selectAll('rect.rs').remove();
            g.append('rect')
                .attr('class', 'rs')
                .attr('width', 1)
                .attr('height', height)
                .attr('fill', 'rgba(0,0,0,.1)')
                // .attr('pointer-events', 'none')
                // .style('pointer-events', 'none')
                .attr('x', coords[0]);
        })
        .on('drag', function(d) {
            let coords = d3.mouse(this);
            let rect = g.select('rect.rs');
            if(coords[0] < this.dropX) {
                // 500 - 499 + 1
                rect
                // .attr('width', this.dropX - coords[0])
                // .attr('width', x - coords[0] + parseInt(rect.attr('width')))
                    .attr('x', coords[0])
            }
            rect.attr('width',  Math.abs(this.dropX - coords[0]));
        })
        .on('end', function(d) {
            // let x1 = 0;
            // let x2 = 0;
            // let startIdx = bisectDate(data, x.invert(x1));
            // let endIdx = bisectDate(data, x.invert(x2));
            // let startTime = data[startIdx]
            // if(this.props.zoom) this.props.zoom()
        })
    );
}

export default class UltraLineGraph extends Component {
    componentDidMount() {
        drawLineChart(ReactDOM.findDOMNode(this), this.props.data);
    }
    render() {
        return (
            <div>
                <svg>
                    <defs>
                        <filter id="f1" x="0" y="0">
                            <feGaussianBlur in="SourceGraphic" stdDeviation="5"></feGaussianBlur>
                        </filter>
                        <filter id="f2" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur in="SourceGraphic" stdDeviation="1"></feGaussianBlur>
                        </filter>
                        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" style={{stopColor: '#b721ff'}}></stop>
                            <stop offset="100%" style={{stopColor: '#21d4fd'}}></stop>
                        </linearGradient>
                    </defs>
                </svg>
            </div>
        )
    }
}