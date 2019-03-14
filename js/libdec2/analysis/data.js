/* 
 * Copyright (C) 2019 deroad
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

module.exports = (function() {
	const Logger = require('libdec2/logger');
	const Block = require('libdec2/analysis/block');
	const r2 = require('libdec2/r2');

	function _convert_to_ir(block, arch) {
		if (arch.pre_conversion) {
			block.opcodes = arch.pre_conversion(block.opcodes);
		}
		for (var i = 0; i < block.opcodes.length; i++) {
			block.opcodes[i] = arch.parse(block.opcodes[i]);
		}
		if (arch.post_conversion) {
			block.opcodes = arch.post_conversion(block.opcodes);
		}
	}

	/**
	 * Decompiler Data
	 * @param {String} name   Routine name
	 * @param {Blocks} blocks Blocks of the routine
	 */
	function DecData(name, blocks) {
		this.name = name;
		this.blocks = blocks;
	}

	/**
	 * Converts all the blocks data to IR
	 */
	DecData.prototype.toIR = function(arch) {
		for (var i = 0; i < this.blocks.length; i++) {
			_convert_to_ir(this.blocks[i], arch);
		}
	};

	/**
	 * Dumps all the decompiler data.
	 */
	DecData.prototype.dump = function() {
		console.log("[DecData " + this.name);
		for (var i = 0; i < this.blocks.length; i++) {
			console.log("    [Block 0x" + this.blocks[i].location.toString(16) + " " + this.blocks[i].opcodes.length);
			this.blocks[i].opcodes.forEach(function(x) {
				console.log("        " + x);
			})
			console.log("    ]");
		}
		console.log("]");
	};

	function _map_opcodes(asm) {
		return asm.opcode;
	}

	function _map_blocks(block) {
		var b = new Block(block.offset, block.ops.map(_map_opcodes));
		if (block.jump) {
			b.setJump(block.jump);
		}
		if (block.fail) {
			b.setFail(block.fail);
		}
		return b;
	}

	function _map_locations(block) {
		return block.offset.toString(16);
	}

	function _fb(address, locations) {
		return locations.indexOf(address.toString(16));
	}

	function _create_dec_data() {
		var graph = r2.json('agj', [])[0];
		if (graph) {
			var blocks = graph.blocks.map(_map_blocks);
			var locations = graph.blocks.map(_map_locations);
			blocks.forEach(function(b, _, bs) {
				var idx;
				if (b.jump && (idx = _fb(b.jump, locations)) >= 0) {
					b.setJump(bs[idx]);
				}
				if (b.fail && (idx = _fb(b.fail, locations)) >= 0) {
					b.setFail(bs[idx]);
				}
			});
			return new DecData(graph.name, blocks);
		}
		return null;
	}

	DecData.create = _create_dec_data;

	return DecData;
})();