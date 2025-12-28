import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfilePanel } from './profile-panel';

describe('ProfilePanel', () => {
  let component: ProfilePanel;
  let fixture: ComponentFixture<ProfilePanel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfilePanel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfilePanel);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
