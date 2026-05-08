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
			id='mask0_2596_2531'
			maskUnits='userSpaceOnUse'
			x='0'
			y='0'
			width='24'
			height='24'
		>
			<rect width='24' height='24' fill='currentColor' />
		</mask>
		<g mask='url(#mask0_2596_2531)'>
			<path
				d='M5 19H19V9.825L14.175 5H5V19ZM5 21C4.45 21 3.97917 20.8042 3.5875 20.4125C3.19583 20.0208 3 19.55 3 19V5C3 4.45 3.19583 3.97917 3.5875 3.5875C3.97917 3.19583 4.45 3 5 3H15L21 9V19C21 19.55 20.8042 20.0208 20.4125 20.4125C20.0208 20.8042 19.55 21 19 21H5ZM7 17H17V15H7V17ZM7 13H17V11H7V13ZM7 9H14V7H7V9Z'
				fill='currentColor'
			/>
		</g>
	</svg>
);

export default SVG;
