/* @jsxImportSource react */
import React, { useEffect } from 'react';
import toastError from "../../errors/toastError";
import { Button } from "@/components/ui/button";

const LocationPreview = ({ image, link, description }) => {
	useEffect(() => {}, [image, link, description]);

	const handleLocation = async() => {
		try {
			window.open(link);
		} catch (err) {
			toastError(err);
		}
	}

	return (
		<div className="min-w-[250px]">
			<div>
				<div className="float-left">
					<img src={image} onClick={handleLocation} className="w-[100px] cursor-pointer" alt="location" />
				</div>
				{ description && (
					<div className="flex flex-wrap">
						<p className="mt-3 ml-4 mr-4 text-primary text-base font-medium mb-2">
							<span dangerouslySetInnerHTML={{ __html: description.replace('\\n', '<br />') }}></span>
						</p>
					</div>
				)}
				<div className="block clear-both"></div>
				<div>
					<hr className="my-2 border-border" />
					<Button
						className="w-full"
						variant="ghost"
						onClick={handleLocation}
						disabled={!link}
					>
						Visualizar
					</Button>
				</div>
			</div>
		</div>
	);
};

export default LocationPreview;
