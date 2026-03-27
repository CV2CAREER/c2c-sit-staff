/* eslint-disable max-len */
import React from 'react';
/**
 *
 * @param {Object} props Component props
 * @return {React.Component} React component
 */
const SVG = (props: any): unknown => (
	<svg
		width='24'
		height='24'
		viewBox='0 0 24 24'
		fill='none'
    xmlns='http://www.w3.org/2000/svg'
    {...props}
	>
		<mask
			id='mask0_2582_2053'
			maskUnits='userSpaceOnUse'
			x='0'
			y='0'
			width='24'
			height='24'
		>
			<rect width='24' height='24' fill='#D9D9D9' />
		</mask>
		<g mask='url(#mask0_2582_2053)'>
			<path d='M11 13H5V11H11V5H13V11H19V13H13V19H11V13Z' fill='white' />
		</g>
	</svg>
);

export default SVG;
